"use strict";

const sendMessage = function(message, data, callback) {
    chrome.runtime.sendMessage({message, data}, callback);
}

const fillPage = function() {
    const searchParams = new URLSearchParams(window.location.search);
    const originURL = searchParams.get('originURL');
    const rootCertIssuer = searchParams.get('rootCertIssuer');

    const rootCertIssuerParts = rootCertIssuer.split(',');

    document.getElementById('originURL').innerText = originURL || "<error>";
    // document.getElementById('rootCertIssuer').innerText = rootCertIssuer || "<error>";
    document.getElementById('rootCertIssuer').innerText = rootCertIssuer.replaceAll(',','\n').replaceAll('=',': ');

    // Button text
    const originHost = (new URL(originURL)).host;
    const rootCAname = rootCertIssuerParts.filter(e => e.startsWith('CN='))[0].substr(3);
    document.getElementById('allowDomain').innerText = `Disable for '${originHost}'`;
    document.getElementById('allowIssuer').innerText = `Trust CA '${rootCAname}'`;

    // Button actions
    const completionCallback = () => {
        window.location = originURL;
    };
    document.getElementById('allowDomain').addEventListener('click', () => {
        sendMessage('whitelist_domain', originHost, completionCallback);
    });
    document.getElementById('allowIssuer').addEventListener('click', () => {
        sendMessage('whitelist_issuer', rootCertIssuer, completionCallback);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    fillPage();
});