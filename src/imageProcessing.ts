import { createCanvas, ImageData, loadImage } from 'canvas';

const PIX_THRESH = 100;
const X_THRESH = 3;

export async function processImage(imagePath: string) {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    const hScanUVstrip = new Uint8ClampedArray(canvas.width);

    const newImageData = new Uint8ClampedArray(imageData.data.length);
    newImageData.fill(0, 0, imageData.data.length);

    for (let i = 0; i < imageData.data.length; i += 4) {
        let pix = imageData.data[i + 2];
        if (pix < PIX_THRESH) {
            pix = 255;
            hScanUVstrip.set([1], (i / 4) % image.width);
        } else {
            pix = 0;
        }
        newImageData.set([pix, pix, pix, 255], i);
    }
    ctx.putImageData(new ImageData(newImageData, image.width, image.height), 0, 0);

    {
        // Character Detection (Horizontal, Scans using Vertical Strips)
        smoothenDetection(hScanUVstrip, X_THRESH);
    }

    for (let x = 0; x < canvas.width; x++) {
        if (hScanUVstrip[x] === 1) {
            ctx.fillStyle = "red";
            ctx.fillRect(x, 1, 1, 1);
        }
    }

    return canvas.toBuffer();
}

function smoothenDetection(detectionArray: Uint8ClampedArray, tolerance: number) {
    let inVoid = true;
    let lastMiss = 0;
    let lastHit = 0;
    for (let i = 0; i < detectionArray.length; i++) {
        const hit = detectionArray[i] === 1;
        if (inVoid) {
            if (hit) {
                inVoid = false;
            }
        } else {
            if (hit) {
                if (lastMiss < X_THRESH) {
                    detectionArray.set(new Array(i - lastHit).fill(1), lastHit);
                } else {
                    inVoid = true;
                }
                lastMiss = 0;
            } else {
                lastMiss += 1;
            }
        }
        if (hit) {
            lastHit = i;
        }
    }
}