import React, { useEffect, useRef, useState, useCallback } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import { layoutProcess } from "bpmn-auto-layout";

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from "bpmn-js-properties-panel";

import camundaModdleDescriptors from "camunda-bpmn-moddle/resources/camunda.json";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";

import "./BpmnModeler.scss";

// -----------------------------
// DEBOUNCE HELPER
// -----------------------------
function debounce(fn, timeout) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), timeout);
  };
}

// Tab constants
const TAB_CANVAS     = "canvas";
const TAB_PROPERTIES = "properties";
const TAB_AI         = "ai";

export default function BpmnModeler() {
  const canvasRef      = useRef(null);
  const propertiesRef  = useRef(null);
  const modelerRef     = useRef(null);
  const importingRef   = useRef(false);
  const downloadXmlRef = useRef(null);
  const downloadSvgRef = useRef(null);

  const [userRequest, setUserRequest] = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState(TAB_CANVAS);

  // -----------------------------
  // CLEAN LLM XML OUTPUT
  // -----------------------------
  const cleanXML = (xml) => {
    if (!xml) return xml;
    return xml.replace(/```xml/g, "").replace(/```/g, "").trim();
  };

  // -----------------------------
  // ENSURE DIAGRAM INTERCHANGE
  // -----------------------------
  const ensureDiagramInterchange = async (xml) => {
    if (xml.includes("bpmndi:BPMNDiagram")) return xml;
    try {
      return await layoutProcess(xml);
    } catch (err) {
      console.warn("bpmn-auto-layout failed:", err);
      return xml;
    }
  };

  // -----------------------------
  // SAFE IMPORT
  // -----------------------------
  const safeImport = async (xml) => {
    if (!modelerRef.current || importingRef.current) return;
    importingRef.current = true;
    try {
      const { warnings } = await modelerRef.current.importXML(xml);
      if (warnings?.length) console.warn("BPMN import warnings:", warnings);
      modelerRef.current.get("canvas").zoom("fit-viewport");
    } catch (err) {
      console.error("Import failed:", err);
      setError("Failed to render BPMN diagram: " + err.message);
    } finally {
      importingRef.current = false;
    }
  };

  // -----------------------------
  // SET ENCODED LINK
  // -----------------------------
  const setEncoded = (linkEl, filename, data) => {
    if (!linkEl) return;
    if (data) {
      const encoded = encodeURIComponent(data);
      const mime = filename.endsWith(".svg")
          ? "image/svg+xml"
          : "application/bpmn20-xml;charset=UTF-8";
      linkEl.href     = `data:${mime},${encoded}`;
      linkEl.download = filename;
      linkEl.classList.add("active");
    } else {
      linkEl.href = "#";
      linkEl.classList.remove("active");
    }
  };

  // -----------------------------
  // EXPORT ARTIFACTS (debounced)
  // -----------------------------
  const exportArtifacts = useCallback(
      debounce(async () => {
        if (!modelerRef.current) return;
        try {
          const { svg } = await modelerRef.current.saveSVG();
          setEncoded(downloadSvgRef.current, "diagram.svg", svg);
        } catch (err) {
          setEncoded(downloadSvgRef.current, "diagram.svg", null);
        }
        try {
          const { xml } = await modelerRef.current.saveXML({ format: true });
          setEncoded(downloadXmlRef.current, "diagram.bpmn", xml);
        } catch (err) {
          setEncoded(downloadXmlRef.current, "diagram.bpmn", null);
        }
      }, 500),
      []
  );

  // -----------------------------
  // SAVE XML
  // -----------------------------
  const saveXML = useCallback(async () => {
    const { xml } = await modelerRef.current.saveXML({ format: true });
    return xml;
  }, []);

  // -----------------------------
  // INIT MODELER
  // -----------------------------
  useEffect(() => {
    const modeler = new Modeler({
      container: canvasRef.current,
      propertiesPanel: { parent: propertiesRef.current },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        CamundaPlatformPropertiesProviderModule,
      ],
      moddleExtensions: { camunda: camundaModdleDescriptors },
    });

    modelerRef.current = modeler;
    modeler.on("commandStack.changed", exportArtifacts);

    const loadDiagram = async () => {
      try {
        const res    = await fetch("/processes/Diagram.bpmn");
        const rawXml = await res.text();
        const xml    = await ensureDiagramInterchange(rawXml);
        await safeImport(xml);
        exportArtifacts();
      } catch (err) {
        console.error("Error loading BPMN:", err);
        setError("Failed to load BPMN diagram");
      }
    };

    loadDiagram();
    return () => modelerRef.current?.destroy();
  }, []);

  // Re-fit canvas when switching back to canvas tab on mobile
  useEffect(() => {
    if (activeTab === TAB_CANVAS && modelerRef.current) {
      // Small delay lets the DOM finish showing the canvas before fitting
      setTimeout(() => {
        modelerRef.current.get("canvas").zoom("fit-viewport");
      }, 50);
    }
  }, [activeTab]);

  // -----------------------------
  // AI MUTATION FLOW
  // -----------------------------
  const executeAiMutation = useCallback(async () => {
    if (!userRequest.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const currentXml = await saveXML();
      const response   = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/bpmn/generate`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ userRequest, currentXml }),
          }
      );
      if (!response.ok) throw new Error("Server error: " + response.status);

      const data = await response.json();
      let mutatedXml = data?.newXml || data;
      if (typeof mutatedXml !== "string") {
        throw new Error("Invalid BPMN XML returned from API");
      }
      mutatedXml = cleanXML(mutatedXml);
      mutatedXml = await ensureDiagramInterchange(mutatedXml);
      await safeImport(mutatedXml);
      setUserRequest("");
      // Switch to canvas tab on mobile so user sees the result
      setActiveTab(TAB_CANVAS);
    } catch (err) {
      console.error(err);
      setError(err.message || "Mutation failed");
    } finally {
      setIsLoading(false);
    }
  }, [userRequest, saveXML]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
      <div className="workspace-container">

        {/* ── Desktop: three-column layout ─────────────────────────────────── */}
        {/* ── Mobile: full-screen panels controlled by activeTab ───────────── */}

        {/* Canvas panel */}
        <div className={`canvas-area ${activeTab === TAB_CANVAS ? "mobile-active" : "mobile-hidden"}`}>
          <div className="canvas-badge">BPMN 2.0 INTERACTIVE ENGINE</div>
          <div ref={canvasRef} id="js-canvas" />
          <div className="canvas-toolbar">
            <a ref={downloadXmlRef} className="toolbar-btn" href="#" title="Download BPMN XML">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 12l-4.5-4.5 1.06-1.06L7 9.88V1h2v8.88l2.44-2.44 1.06 1.06L8 12z" />
                <path d="M2 13h12v2H2z" />
              </svg>
              <span>Download BPMN</span>
            </a>
            <a ref={downloadSvgRef} className="toolbar-btn" href="#" title="Export as SVG">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zm-1 12H3V3h10v10z" />
                <path d="M5 10l2-2.5L9 10l2-3 2 4H3z" />
              </svg>
              <span>Export as SVG</span>
            </a>
          </div>
        </div>

        {/* Properties panel */}
        <div
            ref={propertiesRef}
            id="js-properties-panel"
            className={`properties-panel-container ${activeTab === TAB_PROPERTIES ? "mobile-active" : "mobile-hidden"}`}
        />

        {/* AI Sidebar */}
        <div className={`ai-sidebar ${activeTab === TAB_AI ? "mobile-active" : "mobile-hidden"}`}>
          <div className="sidebar-header">
            <h2>BPMN AI Copilot</h2>
            <p>Modify or extend the process using natural language.</p>
            <hr className="sidebar-divider" />
          </div>

          <div className="input-group">
            <span className="input-label">Mutation Command Prompt</span>
            <textarea
                className="prompt-textarea"
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                disabled={isLoading}
                placeholder="e.g. Add approval task between User Task1 and User Task2"
            />
          </div>

          {error && (
              <div className="error-banner">
                <strong>Pipeline Exception:</strong> {error}
              </div>
          )}

          <div className="action-block">
            <button
                className="submit-btn"
                onClick={executeAiMutation}
                disabled={isLoading || !userRequest.trim()}
            >
              {isLoading ? "Mutating Architecture..." : "Execute Agent Mutation"}
            </button>
            <div className="connection-profile">Connected Profile: Spring RAG</div>
          </div>
        </div>

        {/* ── Mobile tab bar (hidden on desktop) ───────────────────────────── */}
        <nav className="mobile-tabbar">
          <button
              className={`tab-btn ${activeTab === TAB_CANVAS ? "tab-active" : ""}`}
              onClick={() => setActiveTab(TAB_CANVAS)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="7" cy="10" r="2"/>
              <path d="M9 10h4M11 8l2 2-2 2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            </svg>
            <span>Canvas</span>
          </button>

          <button
              className={`tab-btn ${activeTab === TAB_PROPERTIES ? "tab-active" : ""}`}
              onClick={() => setActiveTab(TAB_PROPERTIES)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 5h12M4 8h8M4 11h10M4 14h6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
            <span>Properties</span>
          </button>

          <button
              className={`tab-btn ${activeTab === TAB_AI ? "tab-active" : ""}`}
              onClick={() => setActiveTab(TAB_AI)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 10c-2 0-3.8-1-4.9-2.5.1-1.6 3.3-2.5 4.9-2.5s4.8.9 4.9 2.5C13.8 14 12 15 10 15z"/>
            </svg>
            <span>AI Copilot</span>
          </button>
        </nav>

      </div>
  );
}
