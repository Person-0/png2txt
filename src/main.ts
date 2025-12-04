import express from "express";
import { processImage } from "./imageProcessing";

async function main() {
    const app = express();

    const processed = await processImage('samples/7GZ58H.jpg');

    app.get("/img", (req, res) => {
        res.type("png");
        res.send(processed);
    })

    app.get("/", (req, res) => {
        res.send(`<img src="/img" style="position: absolute; width: 80vw; margin: auto; left: 0; top: 0; bottom: 0; right: 0;">`);
    })
    
    app.listen(8080, () => {
        console.log("app listenting on port 8080");
    })
}

main();