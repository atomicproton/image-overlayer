const express = require('express');
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const sharp = require("sharp");
const jimp = require('jimp');

const port = 4480;

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
        if(!req.file) {
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

                fs.rename(tempPath, rawFilePath, async err => {
                    if (err) return handleError(err, res);

                    await sharp(rawFilePath)
                        .resize(1989, 2574, {fit: sharp.fit.fill})
                        .png()
                        .toFile(resizedFilePath).then(async () => {
                            const resizedImage = await jimp.read(resizedFilePath);
                            const negative = await jimp.read(resizedFilePath);
                            const oldImage = await jimp.read(previousFilePath);

                            await oldImage.invert();
                            await negative.invert();
                            await negative.mask(oldImage, 0, 0);
                            await resizedImage.composite(negative, 0, 0);
                            await resizedImage.write(processedFilePath);

                        }).catch(err => {
                            console.log(err)
                            handleError(err, res);
                        });

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

expressApp.use(express.static('public'))

expressApp.listen(port, () => {
    console.info(`Running on port ${port}`);
});

