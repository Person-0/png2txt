async function processResult(b64ImageData, resultType) {
    const params = new URLSearchParams();
    params.append("b64data", b64ImageData);
    if (resultType === "image") {
        params.append("image", "true");
    }
    const res = await fetch("./api/predict", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    });
    return await res.json();
}

async function processImage(type = "text") {
    const fileInput = document.getElementById('fileInput');
    const base64Input = document.getElementById('base64Input');

    let b64ImageData = null;

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        const readerPromise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        }).catch(console.log);
        reader.readAsDataURL(fileInput.files[0]);
        b64ImageData = await readerPromise;
    } else if (base64Input.value.trim() !== "") {
        b64ImageData = base64Input.value.trim();
    } else {
        alert("Please select a file or paste Base64 encoded image data.");
        return;
    }

    if (b64ImageData && b64ImageData.length > 0) {
        const result = await processResult(b64ImageData, type);
        if (result.error) {
            alert(
                "Eror: " + (
                    typeof result.message === "string" && result.message.length > 0
                ) ? result.message : "Unknown Error"
            );
            return;
        }
        showResult(result.helpImage, result.prediction, type);
    }
}

function showResult(img, text, resultType) {
    const resultSection = document.getElementById('result-section');
    const resultImage = document.getElementById('result-image');
    const resultText = document.getElementById('result-text');
    resultSection.style.display = "block";
    if (resultType === "text") {
        document.querySelectorAll(".text-result").forEach(e => e.style.display = "block");
        resultText.innerHTML = text;
    } else {
        document.querySelectorAll(".text-result").forEach(e => e.style.display = "none");
    }
    resultImage.onload = () => window.scrollTo(0, document.body.scrollHeight);
    resultImage.src = img;
}