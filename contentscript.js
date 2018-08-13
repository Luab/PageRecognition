/*
    Firefox addon "Save Screenshot"
    Copyright (C) 2017  Manuel Reimer <manuel.reimer@gmx.de>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

async function OnMessage(request, sender, sendResponse) {
  const prefs = await(browser.storage.local.get());
  let format = prefs.format || "png";
  let region = prefs.region || "full";

  if (format == "manual")
    format = request.format;
  if (region == "manual")
    region = request.region;
  var elem = document.createElement('div');
  elem.id = "canvas";
  var dimension = [document.documentElement.clientWidth, document.documentElement.clientHeight];
  elem.width = dimension[0];
  elem.height = dimension[1];
  while (document.body.firstChild)
  {
    elem.appendChild(document.body.firstChild);
  }
  document.body.appendChild(elem);
  initDraw(document.getElementById('canvas'));
}


function initDraw(canvas) {
    function setMousePosition(e) {
        var ev = e || window.event; //Moz || IE
        if (ev.pageX) { //Moz
            mouse.x = ev.pageX + window.pageXOffset;
            mouse.y = ev.pageY + window.pageYOffset;
        } else if (ev.clientX) { //IE
            mouse.x = ev.clientX + document.body.scrollLeft;
            mouse.y = ev.clientY + document.body.scrollTop;
        }
    };

    var mouse = {
        x: 0,
        y: 0,
        startX: 0,
        startY: 0
    };
    var element = null;

    canvas.onmousemove = function (e) {
        setMousePosition(e);
        if (element !== null) {
            element.style.width = Math.abs(mouse.x - mouse.startX) + 'px';
            element.style.height = Math.abs(mouse.y - mouse.startY) + 'px';
            element.style.left = (mouse.x - mouse.startX < 0) ? mouse.x + 'px' : mouse.startX + 'px';
            element.style.top = (mouse.y - mouse.startY < 0) ? mouse.y + 'px' : mouse.startY + 'px';
        }
    }

    canvas.onclick = function (e) {
        if (element !== null) {
            
            CreateMessage(element.style.top,element.style.left,element.style.height,element.style.width)
            
            element = null;
            canvas.style.cursor = "default";
            //Sending message to server            
            console.log("finsihed.");
        } else {
            console.log("begun.");
            mouse.startX = mouse.x;
            mouse.startY = mouse.y;
            element = document.createElement('div');
            element.className = 'rectangle'
            element.style.left = mouse.x + 'px';
            element.style.top = mouse.y + 'px';
            element.style.cssText="border: 1px solid #FF0000;position: absolute;"
            canvas.appendChild(element)
            canvas.style.cursor = "crosshair";
        }
    }
}
function SaveScreenshot(aLeft, aTop, aWidth, aHeight, aFormat) {
  // Maximum size is limited!
  // https://dxr.mozilla.org/mozilla-central/source/dom/canvas/CanvasRenderingContext2D.cpp#5517
  // https://dxr.mozilla.org/mozilla-central/source/gfx/2d/Factory.cpp#316
  if (aHeight > 32767) aHeight = 32767;
  if (aWidth > 32767) aWidth = 32767;
  console.log(aHeight);
  console.log(aWidth);
  var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
  canvas.height = aHeight;
  canvas.width = aWidth;

  var ctx = canvas.getContext("2d");
  ctx.drawWindow(window, aLeft, aTop, aWidth, aHeight, "rgb(0,0,0)");

  let imgdata;
  if (aFormat == "jpg")
    imgdata = canvas.toDataURL("image/jpeg", 0.8);
  else
    imgdata = canvas.toDataURL("image/png");

  TriggerDownload(imgdata, aFormat);
}

function CreateMessage(top,left,height,width) {
  var message = {
    "x": left,
    "y":top,
    "height":height,
    "width":width,
    "URL":document.URL,
    "browser":"firefox"
  };
  console.log(message)
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://94.154.12.234:8888');
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.send(JSON.stringify(message));

}

// Triggers a download for the content aContent named as aFilename.
async function TriggerDownload(aContent, aFormat) {
  if (aFormat == "copy") {
    const port = browser.runtime.connect();
    port.postMessage({content: aContent, action: "copy"});
    port.disconnect();
    return;
  }

  const prefs = await browser.storage.local.get();
  const method = prefs.savemethod || "open";
  const filename = GetDefaultFileName("saved_page") + "." + aFormat;

  // Trigger the firefox "open file" dialog.
  if (method == "open") {
    const a = document.createElement("a");
    a.href = aContent;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  // All other cases have to be communicated to our "background script" as
  // content scripts can't access the "downloads" API.
  else {
    const port = browser.runtime.connect();
    port.postMessage({content: aContent, filename: filename});
    port.disconnect();
  }
}

// Register message event listener
browser.runtime.onMessage.addListener(OnMessage);
