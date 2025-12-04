import express from "express";
import path from "path";
import { processImage } from "./imageProcessing";
import { train } from "./train";

if(process.argv[2] && process.argv[2] === "--prod") {
    console.log("Prod env detected, running main()");
    main();
} else {
    console.log("Test env detected, running train()");
    train(path.join(__dirname, '../samples')).catch(err => console.log(err));
}

async function main() {
    const app = express();

    const processed = await processImage(path.join(__dirname, 'samples/7GZ58H.jpg'));

    app.get("/img", (req, res) => {
        res.type("png");
        res.send(processed.helpImageBuff);
    })

    app.get("/", (req, res) => {
        res.send(`<img src="/img" style="position: absolute; width: 80vw; margin: auto; left: 0; top: 0; bottom: 0; right: 0;">`);
    })
    
    app.listen(8080, () => {
        console.log("app listenting on port 8080");
    })
}