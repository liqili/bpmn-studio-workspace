import React, { Component } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import diagramXML from "../../resources/Diagram";
import "./BpmnModeler.scss";

// Core Layout & Editor Theme Stylesheets (Correct for v3.1.0)
import "bpmn-js/dist/assets/diagram-js.css"; 
import "bpmn-font/dist/css/bpmn-embedded.css";

// Properties Panel Integrations
import propertiesPanelModule from "bpmn-js-properties-panel";
import propertiesProviderModule from "bpmn-js-properties-panel/lib/provider/camunda";
import "bpmn-js-properties-panel/dist/assets/bpmn-js-properties-panel.css";
import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda";

class BpmnModeler extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      userRequest: "",
      isLoading: false,
      error: null
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.executeAiMutation = this.executeAiMutation.bind(this);
  }

  componentDidMount() {
    // Re-initialize with full editing modules and properties panel attachment
    this.modelerInstance = new Modeler({
      container: "#js-canvas",
      propertiesPanel: {
        parent: "#js-properties-panel" // Directs the properties controls to our layout panel
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

    this.modelerInstance.importXML(diagramXML, err => {
      if (err) {
        console.error("Error loading starter base BPMN layout:", err);
        this.setState({ error: "Failed to initialize canvas layout view." });
      }
    });
  }

  handleInputChange(event) {
    this.setState({ userRequest: event.target.value });
  }

  executeAiMutation() {
    const { userRequest } = this.state;
    if (!userRequest.trim()) return;

    this.setState({ isLoading: true, error: null });

    this.modelerInstance.saveXML({ format: true }, (err, currentXml) => {
      if (err) {
        this.setState({ isLoading: false, error: "Failed to extract current layout map." });
        return;
      }

      fetch("http://localhost:8080/api/bpmn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest, currentXml })
      })
        .then(response => {
          if (!response.ok) throw new Error("Server returned an error status: " + response.status);
          return response.json();
        })
        .then(data => {
          let mutatedXml = data && data.newXml ? data.newXml : data;

          if (!mutatedXml || typeof mutatedXml !== "string") {
            throw new Error("Invalid response structural format received from API.");
          }

          // EMERGENCY AUTO-REPAIR FILTER: Corrects LLM closing tag syntax hallucinations
          mutatedXml = mutatedXml.replace(
            /<bpmndi:BPMNShape([^>]*?)>((?:(?!<bpmndi:BPMNLabel>)[\s\S])*?)<\/bpmndi:BPMNLabel>/g, 
            '<bpmndi:BPMNShape$1>$2</bpmndi:BPMNShape>'
          );

          this.modelerInstance.importXML(mutatedXml, importErr => {
            if (importErr) {
              console.error("BPMN Render Error:", importErr);
              this.setState({ 
                isLoading: false, 
                error: "LLM generated broken BPMN layout structures that could not be read." 
              });
            } else {
              this.setState({ userRequest: "", isLoading: false, error: null });
            }
          });
        })
        .catch(fetchErr => {
          this.setState({
            isLoading: false,
            error: fetchErr.message || "Communication loop dropped."
          });
        });
    });
  }

  render() {
    const { userRequest, isLoading, error } = this.state;

    return (
      <div className="workspace-container">
        
        {/* Column 1: Core Modeler Canvas (Contains Left Palette automatically) */}
        <div className="canvas-area">
          <div className="canvas-badge">BPMN 2.0 INTERACTIVE ENGINE</div>
          <div id="js-canvas" />
        </div>

        {/* Column 2: Classic Element Configuration Properties Panel */}
        <div id="js-properties-panel" className="properties-panel-container" />

        {/* Column 3: AI Copilot Control Command Center Sidebar */}
        <div className="ai-sidebar">
          <div className="sidebar-header">
            <h2>BPMN AI Copilot</h2>
            <p>Instruct the assistant to modify elements or inject new tasks.</p>
            <hr className="sidebar-divider" />
          </div>

          <div className="input-group">
            <span className="input-label">Mutation Command Prompt</span>
            <textarea
              className="prompt-textarea"
              value={userRequest}
              onChange={this.handleInputChange}
              disabled={isLoading}
              placeholder='e.g., "Add a user approval task named - client approval right between User Task1 and User Task2."'
            />
            {error && (
              <div className="error-banner">
                <strong>Pipeline Exception:</strong> {error}
              </div>
            )}
          </div>

          <div className="action-block">
            <button
              className="submit-btn"
              onClick={this.executeAiMutation}
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
}

export default BpmnModeler;