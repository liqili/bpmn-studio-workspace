import React, { useEffect, useRef, useState, useCallback } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import { layoutProcess } from "bpmn-auto-layout";

// v5 properties panel — named exports only, no default
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from "bpmn-js-properties-panel";

// Camunda 7 moddle (v7+ has named exports)
import camundaModdleDescriptors from "camunda-bpmn-moddle/resources/camunda";

// CSS — paths changed in v18
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";

import "./BpmnModeler.scss";

export default function BpmnModeler() {
  const canvasRef = useRef(null);
  const propertiesRef = useRef(null);
  const modelerRef = useRef(null);
  const importingRef = useRef(false);

  const [userRequest, setUserRequest] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // -----------------------------
  // CLEAN LLM XML OUTPUT
  // -----------------------------
  const cleanXML = (xml) => {
    if (!xml) return xml;
    return xml.replace(/```xml/g, "").replace(/```/g, "").trim();
  };

  // -----------------------------
  // ENSURE DI — uses bpmn-auto-layout (works standalone, no bpmn-js dep)
  // -----------------------------
  const ensureDiagramInterchange = async (xml) => {
    if (xml.includes("bpmndi:BPMNDiagram")) return xml;
    try {
      return await layoutProcess(xml);
    } catch (err) {
      console.warn("bpmn-auto-layout failed:", err);
      return xml; // graceful fallback
    }
  };

  // -----------------------------
  // SAFE IMPORT — v18 uses Promise-based importXML (no callback)
  // -----------------------------
  const safeImport = async (xml) => {
    if (!modelerRef.current || importingRef.current) return;
    importingRef.current = true;

    try {
      // v18: importXML returns a Promise, NOT a callback
      const { warnings } = await modelerRef.current.importXML(xml);

      if (warnings?.length) {
        console.warn("BPMN import warnings:", warnings);
      }

      modelerRef.current.get("canvas").zoom("fit-viewport");
    } catch (err) {
      console.error("Import failed:", err);
      setError("Failed to render BPMN diagram: " + err.message);
    } finally {
      importingRef.current = false;
    }
  };

  // -----------------------------
  // INIT MODELER
  // -----------------------------
  useEffect(() => {
    const modeler = new Modeler({
      container: canvasRef.current,
      propertiesPanel: {
        parent: propertiesRef.current,
      },
      additionalModules: [
        BpmnPropertiesPanelModule,         // core panel infrastructure
        BpmnPropertiesProviderModule,       // standard BPMN properties
        CamundaPlatformPropertiesProviderModule, // Camunda 7 properties
      ],
      moddleExtensions: {
        camunda: camundaModdleDescriptors,
      },
    });

    modelerRef.current = modeler;

    const loadDiagram = async () => {
      try {
        const res = await fetch("/processes/Diagram.bpmn");
        const rawXml = await res.text();
        const xml = await ensureDiagramInterchange(rawXml);
        await safeImport(xml);
      } catch (err) {
        console.error("Error loading BPMN:", err);
        setError("Failed to load BPMN diagram");
      }
    };

    loadDiagram();

    return () => modelerRef.current?.destroy();
  }, []);

  // -----------------------------
  // SAVE XML — v18 saveXML also returns a Promise
  // -----------------------------
  const saveXML = useCallback(async () => {
    // v18: saveXML is Promise-based, returns { xml, error }
    const { xml } = await modelerRef.current.saveXML({ format: true });
    return xml;
  }, []);

  // -----------------------------
  // AI MUTATION FLOW
  // -----------------------------
  const executeAiMutation = useCallback(async () => {
    if (!userRequest.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentXml = await saveXML();

      const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/bpmn/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userRequest, currentXml }),
          }
      );

      if (!response.ok) throw new Error("Server error: " + response.status);

      const data = await response.json();
      let mutatedXml = data?.newXml || data;

      if (typeof mutatedXml !== "string") {
        throw new Error("Invalid BPMN XML returned from API");
      }

      // 1. Strip markdown fences from LLM output
      mutatedXml = cleanXML(mutatedXml);

      // 2. Auto-generate DI if LLM returned semantic-only XML
      mutatedXml = await ensureDiagramInterchange(mutatedXml);

      // 3. Render
      await safeImport(mutatedXml);

      setUserRequest("");
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
        <div className="canvas-area">
          <div className="canvas-badge">BPMN 2.0 INTERACTIVE ENGINE</div>
          <div ref={canvasRef} id="js-canvas" />
        </div>

        <div
            ref={propertiesRef}
            id="js-properties-panel"
            className="properties-panel-container"
        />

        <div className="ai-sidebar">
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
      </div>
  );
}
