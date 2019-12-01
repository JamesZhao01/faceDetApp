import React from "react";
import logo from "./logo.svg";
import WebcamComponent from "./webcam.js";

import "./custom.scss";
import faceapi from "face-api.js";
const MODEL_URL = "/models";

function App() {
  return (
    <div>
      <WebcamComponent />
    </div>
  );
}

export default App;
