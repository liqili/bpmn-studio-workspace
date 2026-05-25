import React, { Component } from "react";
import BpmnModeler from "./components/BpmnModeler/BpmnModeler";

class App extends Component {
  render() {
    return (
      <div className="App" style={{ height: "100%" }}>
        <BpmnModeler />
      </div>
    );
  }
}

export default App;
