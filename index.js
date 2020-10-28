const express = require('express');
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const sharp = require("sharp");
const jimp = require('jimp');

const port = 4480;

// Paper: 1989, 2574
const width = 2024;
const height = 2024;

// Set up website
const expressApp = express();

const upload = multer({
    dest: "./images/raw"
    // you might also want to set some limits: https://github.com/expressjs/multer#limits
});

const handleError = (err, res) => {
    console.log(err)
    res
        .status(500)
        .contentType("text/plain")
        .end("Oops! Something went wrong!");
};

expressApp.post(
    "/upload",
    upload.single("file"),
    async (req, res) => {
        if (!req.file) {
            res.status(400)
                .contentType("text/plain")
                .end("No file submitted");
            return;
        }
        const tempPath = req.file.path;

        const rawExtension = path.extname(req.file.originalname).toLowerCase();
        if (rawExtension === ".png" || rawExtension === ".jpg") {
            fs.readdir(path.join(__dirname, "images/raw"), async (err, files) => {
                if (err) return handleError(err, res);

                const step = files.length;
                const rawFilePath = path.join(__dirname, "images/raw/" + step + rawExtension);
                const resizedFilePath = path.join(__dirname, "images/resized/" + step + ".png");
                const processedFilePath = path.join(__dirname, "images/processed/" + step + ".png");
                const previousFilePath = path.join(__dirname, "images/processed/" + (step - 1) + ".png");

                // Resize image
                await fs.renameSync(tempPath, rawFilePath);
                const uploadedImage = await jimp.read(rawFilePath);
                await uploadedImage.resize(width, height);
                await uploadedImage.writeAsync(resizedFilePath);

                const resizedImage = await jimp.read(resizedFilePath);
                const negative = await jimp.read(resizedFilePath);
                await negative.invert();
                const oldImage = await jimp.read(previousFilePath);

                await oldImage.invert();
                await negative.mask(oldImage, 0, 0);
                await resizedImage.composite(negative, 0, 0);
                await resizedImage.write(processedFilePath, () => {
                    res.status(200)
                        .redirect("step.html?step=" + step);

                });
            });
        } else {
            fs.unlink(tempPath, err => {
                if (err) return handleError(err, res);

                res
                    .status(403)
                    .contentType("text/plain")
                    .end("Only .png or .jpg files are allowed!");
            });
        }
    }
);

expressApp.get("/image", async (req, res) => {
    const type = req.query.type;
    const step = req.query.step;

    const parsedStep = parseInt(step);
    if (isNaN(parsedStep)) {
        res.status(403)
            .contentType("text/plain")
            .end("Invalid request");
    }

    let filepath;
    if (type === "resized") {
        filepath = path.join(__dirname, "images/resized/" + parsedStep + ".png");
    } else if (type === "processed") {
        filepath = path.join(__dirname, "images/processed/" + parsedStep + ".png");
    } else {
        res.status(403)
            .contentType("text/plain")
            .end("Invalid request");
    }

    res.status(200)
        .sendFile(filepath);
});

expressApp.get("/currentImage", async (req, res) => {
    fs.readdir(path.join(__dirname, "images/raw"), async (err, files) => {
        if (err) return handleError(err, res);

        const step = files.length;
        const processedFilePath = path.join(__dirname, "images/processed/" + step + ".png");
        res.status(200)
            .sendFile(processedFilePath);
    });
});

expressApp.get("/reset", async (req, res) => {
    const processedDir = path.join(__dirname, "images/processed/");
    const rawDir = path.join(__dirname, "images/raw/");
    const resizedDir = path.join(__dirname, "images/resized/");
    const dirs = [processedDir, rawDir, resizedDir];

    for (const dir of dirs) {
        fs.readdir(dir, (err, files) => {
            if (err) throw err;

            for (const file of files) {
                if (file !== "1.png") {
                    console.log("Deleting " + file);
                    fs.unlink(path.join(dir, file), err => {
                        if (err) throw err;
                    });
                }
            }
        });
    }

    // Resize base file
    const baseFile = await jimp.read(path.join(rawDir, "1.png"));
    baseFile.resize(width, height);
    await baseFile.writeAsync(path.join(resizedDir, "1.png"));
    await baseFile.writeAsync(path.join(processedDir, "1.png"));

    res.status(200)
        .redirect("/");
});

expressApp.use(express.static('public'))

expressApp.listen(port, () => {
    console.info(`Running on port ${port}`);
});

