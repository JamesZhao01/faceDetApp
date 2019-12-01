import Webcam from "react-webcam";
import React, { Component } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import { Container, Row, Col, Form } from "react-bootstrap";
import stock from "./img/download.jpg";
import * as faceapi from "face-api.js";

async function loadModels() {
  const MODEL_URL = process.env.PUBLIC_URL + "/models";
  await faceapi.loadTinyFaceDetectorModel(MODEL_URL);
  await faceapi.loadFaceLandmarkModel(MODEL_URL);
  await faceapi.loadFaceLandmarkModel(MODEL_URL);
  await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
}

async function getFullFaceDescription(blob, inputSize = 1024) {
  let scoreThreshold = 0.5;
  const OPTION = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold,
  });
  const useTinyModel = true;

  console.log("starting fetching image");
  // fetch image to api
  let img = await faceapi.fetchImage(blob);

  console.log("starting facial desc");
  // detect all faces and generate full description from image
  // including landmark and descriptor of each face
  let fullDesc = await faceapi.detectAllFaces(img, OPTION).withFaceLandmarks();
  console.log("end facial desc");
  return fullDesc;
}
const videoConstraints = {
  width: 320,
  height: 240,
  facingMode: "user",
};

class WebcamComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { img: "" };
    loadModels();
  }
  apiRequest = (angle1, angle2) => {
    fetch("http://localhost:3001/?a1=" + angle1 + "&a2=" + angle2)
      .then(res => {
        console.log(res);
      })
      .catch(err => {
        console.log(err);
      });
  };
  setupCanvas = (canvas, ctx, imageSource = "") => {
    const cImage = new Image();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#FF0000";
    let webcamRef = this.refs.webcam;

    const imageSrc = imageSource == "" ? webcamRef.getScreenshot() : imageSource;

    cImage.onload = () => {
      ctx.drawImage(cImage, 0, 0);
    };
    cImage.src = imageSrc;

    return imageSrc;
  };

  capture = () => {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext("2d");
    const cImage = this.setupCanvas(canvas, ctx);

    getFullFaceDescription(cImage).then(data => {
      console.log(data);
      console.log(data[0]["box"]);

      let box = data[0]["alignedRect"]["box"];
      let landmarks = data[0]["landmarks"]["positions"];

      let avgLeft = [0, 0];
      let avgRight = [0, 0];
      // 37-42 left eye, 43-48 right eye
      for (let i = 0; i < 6; i++) {
        let item = landmarks[i + 36];
        let item2 = landmarks[i + 42];
        ctx.strokeStyle = "#00FF00";
        ctx.fillStyle = "#00FF00";
        ctx.fillRect(item["x"] - 2, item["y"] - 2, 4, 4);
        avgLeft[0] += item["x"];
        avgLeft[1] += item["y"];
        ctx.fillStyle = "#0000FF";
        ctx.fillRect(item2["x"] - 2, item2["y"] - 2, 4, 4);
        avgRight[0] += item2["x"];
        avgRight[1] += item2["y"];
      }
      ctx.strokeStyle = "#FF0000";
      ctx.strokeRect(box["x"], box["y"], box["width"], box["height"]);

      avgLeft[0] /= 6;
      avgLeft[1] /= 6;
      avgRight[0] /= 6;
      avgRight[1] /= 6;

      console.log(avgLeft);
      console.log(avgRight);

      avgLeft[0] = avgLeft[0] - avgRight[0];
      avgLeft[1] = avgLeft[1] - avgRight[1];

      let width = 400;
      let height = 300;

      let pixelEyeDist = Math.sqrt(Math.pow(avgLeft[0], 2) + Math.pow(avgLeft[1], 2));
      // 60 pixels / pixelEyeDist ~= distance in feet * 30.48 cm in 1 foot
      let distanceToCamera = (60.0 / pixelEyeDist) * 30.48;
      let pxPerCm = pixelEyeDist / 7.0;
      /* eyedist = 7cm */
      /* 1 ft ~= 60 px */
      let offsetX = box["x"] - width / 2.0;
      let offsetY = box["y"] - height / 2.0;

      let cmOffsetX = offsetX / pxPerCm;
      let cmOffsetY = offsetY / pxPerCm;

      cmOffsetX += this.refs.xOffset.value;

      console.log("cmOffsetX: " + cmOffsetX + " cmOffsetY: " + cmOffsetY + " pxPerCm: " + pxPerCm + " pixelEyeDist: " + pixelEyeDist);

      let horizAngle;
      let x = Math.abs(cmOffsetX);
      let calcCmOffsetX = cmOffsetX * -1;
      let d = distanceToCamera;
      let r = 2; // length of radius arm
      if (calcCmOffsetX < -2) {
        horizAngle = Math.PI - Math.acos(x / d) - Math.acos(r / d);
      } else if (calcCmOffsetX >= -2 && calcCmOffsetX <= 0) {
        horizAngle = 0;
      } else if (calcCmOffsetX > 0 && calcCmOffsetX <= 2) {
        horizAngle = Math.PI;
      } else {
        horizAngle = Math.acos(x / d) + Math.acos(r / d);
      }
      horizAngle *= 180 / Math.PI;

      console.log("horizAngle: ", horizAngle);
    });
  };

  render() {
    return (
      <Container>
        <Row>
          <Col className="text-center">
            <h1 className="display-3">Simple App</h1>
          </Col>
        </Row>

        <hr></hr>
        <Row>
          <Col className="text-center">
            <h1 className="display-6">Parameters</h1>
          </Col>
        </Row>
        <Row>
          <Col>
            {/* className="d-flex flex-row row" style={{ paddingLeft: 12, paddingRight: 12 }} */}
            <Form.Label>Angle1: </Form.Label>
            <Form.Control type="text" ref="angle1" defaultValue="6"></Form.Control>
            <Form.Label>Angle2: </Form.Label>
            <Form.Control type="text" ref="angle2" defaultValue="6"></Form.Control>
            <Form.Label>PiIP: </Form.Label>
            <Form.Control type="text" ref="ip" defaultValue="192.168.137.198"></Form.Control>
            <Form.Label>PiPort: </Form.Label>
            <Form.Control type="text" ref="port" defaultValue="5000"></Form.Control>
            <button
              onClick={() => {
                this.apiRequest(this.refs.angle1.value, this.refs.angle2.value);
              }}
            >
              SendToServo
            </button>
          </Col>
          <Col>
            <Form.Label>IP</Form.Label>
            <Form.Control type="text" placeholder="192.168.137.198"></Form.Control>
          </Col>
          <Col>
            <Form.Label>xOffset</Form.Label>
            <Form.Control type="number" ref="xOffset" defaulValue="0"></Form.Control>
          </Col>
          <Col>
            <Form.Label>arm2length</Form.Label>
            <Form.Control type="number" ref="arm2"></Form.Control>
          </Col>
        </Row>

        <Row>
          <Col className="text-center" style={{ height: 240 }}>
            <Webcam audio={false} ref="webcam" screenshotFormat="image/jpeg" videoConstraints={videoConstraints} />
          </Col>
        </Row>
        <Row>
          <Col className="text-center">
            <button
              onClick={() => {
                this.capture();
              }}
            >
              Cap
            </button>
          </Col>
        </Row>
        <Row>
          <Col className="text-center" style={{ height: 240 }}>
            <canvas ref="canvas" width={320} height={240} />
          </Col>
        </Row>
      </Container>
    );
  }
}

export default WebcamComponent;
