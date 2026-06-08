import React, { useEffect, useRef, useState, useCallback } from "react";
import Modeler from "bpmn-js/lib/Modeler";

import "./BpmnModeler.scss";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-font/dist/css/bpmn-embedded.css";

// Properties Panel
import propertiesPanelModule from "bpmn-js-properties-panel";
import propertiesProviderModule from "bpmn-js-properties-panel/lib/provider/camunda";
import "bpmn-js-properties-panel/dist/assets/bpmn-js-properties-panel.css";

import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda";

export default function BpmnModeler() {
  const canvasRef = useRef(null);
  const propertiesRef = useRef(null);
  const modelerRef = useRef(null);

  const importingRef = useRef(false);

  const [userRequest, setUserRequest] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // -----------------------------
  // CLEAN XML
  // -----------------------------
  const cleanXML = (xml) => {
    if (!xml) return xml;

    return xml
        .replace(/```xml/g, "")
        .replace(/```/g, "")
        .trim();
  };

  // -----------------------------
  // SAFE IMPORT (FIXED)
  // -----------------------------
  const safeImport = useCallback(async (xml) => {
    if (!modelerRef.current) return;
    if (importingRef.current) return;

    importingRef.current = true;

    try {
      const result = await modelerRef.current.importXML(xml);

      if (result?.warnings?.length) {
        console.warn("BPMN warnings:", result.warnings);
      }

      // IMPORTANT: verify model actually loaded
      const canvas = modelerRef.current.get("canvas");
      const root = canvas?.getRootElement?.();

      if (!root) {
        throw new Error("BPMN canvas failed to render root element");
      }
    } catch (err) {
      console.error("Import failed:", err);
      setError("Failed to render BPMN diagram");
    } finally {
      importingRef.current = false;
    }
  }, []);

  // -----------------------------
  // INIT MODELER
  // -----------------------------
  useEffect(() => {
    const init = async () => {
      const modeler = new Modeler({
        container: canvasRef.current,
        propertiesPanel: {
          parent: propertiesRef.current
        },
        additionalModules: [
          propertiesPanelModule,
          propertiesProviderModule
        ],
        moddleExtensions: {
          camunda: camundaModdleDescriptor
        },
        keyboard: {
          bindTo: window
        }
      });

      modelerRef.current = modeler;

      // ensure DOM ready
      await new Promise((r) => setTimeout(r, 0));

      try {
        const res = await fetch("/processes/Diagram.bpmn");
        const xml = await res.text();

        await safeImport(xml);
      } catch (err) {
        console.error("Error loading BPMN:", err);
        setError("Failed to load BPMN diagram");
      }
    };

    init();

    return () => {
      modelerRef.current?.destroy();
    };
  }, [safeImport]);

  // -----------------------------
  // SAVE XML
  // -----------------------------
  const saveXML = useCallback(() => {
    return new Promise((resolve, reject) => {
      modelerRef.current.saveXML({ format: true }, (err, xml) => {
        if (err) reject(err);
        else resolve(xml);
      });
    });
  }, []);

  // -----------------------------
  // AI MUTATION
  // -----------------------------
  const executeAiMutation = useCallback(async () => {
    if (!userRequest.trim()) return;
    if (importingRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentXml = await saveXML();

      const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/bpmn/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              userRequest,
              currentXml
            })
          }
      );

      if (!response.ok) {
        throw new Error("Server error: " + response.status);
      }

      const data = await response.json();

      let mutatedXml = data?.newXml || data;

      if (typeof mutatedXml !== "string") {
        throw new Error("Invalid BPMN XML returned from API");
      }

      mutatedXml = cleanXML(mutatedXml);

      await safeImport(mutatedXml);

      setUserRequest("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Mutation failed");
    } finally {
      setIsLoading(false);
    }
  }, [userRequest, saveXML, safeImport]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
      <div className="workspace-container">

        {/* Canvas */}
        <div className="canvas-area">
          <div className="canvas-badge">
            BPMN 2.0 INTERACTIVE ENGINE
          </div>
          <div ref={canvasRef} id="js-canvas" />
        </div>

        {/* Properties Panel */}
        <div
            ref={propertiesRef}
            id="js-properties-panel"
            className="properties-panel-container"
        />

        {/* AI Sidebar */}
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
              {isLoading
                  ? "Mutating Architecture..."
                  : "Execute Agent Mutation"}
            </button>

            <div className="connection-profile">
              Connected Profile: Spring RAG
            </div>
          </div>

        </div>
      </div>
  );
}
