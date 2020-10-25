// const queryString = window.location.search;
// const urlParams = new URLSearchParams(queryString);
// const step = urlParams.get("step");
console.log(getUrlVars()["step"]);
const step = parseInt(getUrlVars()["step"]);

addImage("processed", step - 1, "before");
addImage("resized", step, "raw");
addImage("processed", step, "processed");

document.getElementById("left-button").href = "/step.html?step=" + (step - 1);
document.getElementById("right-button").href = "/step.html?step=" + (step + 1);

function addImage(type, imageStep, colId) {
    const image = document.createElement("img");
    image.src = "/image?type=" + type + "&step=" + imageStep;
    document.getElementById(colId).append(image);
}

function getUrlVars() {
    const vars = {};
    const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}
