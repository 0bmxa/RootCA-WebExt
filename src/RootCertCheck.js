"use strict";

const config = {
    enabled: false,
    whitelists: {
        rootIssuer: new Set(),
        originHost: new Set(),
    }
};

// Init
const init = () => {
    // TODO: Load config from storage...?
}
init();


const headersReceivedCallback = async function(requestDetails) {
    console.debug(`Request: ${requestDetails.url}`);

    // Get sec info from request
    const reqID = requestDetails.requestId;
    const secInfoOptions = {
        certificateChain: true
    };
    const secInfo = await browser.webRequest.getSecurityInfo(reqID, secInfoOptions);
    if (secInfo.state !== "secure" && secInfo.state !== "weak") {
        console.warn('[WARN] Connection security state:', secInfo.state);
        return
    }

    // Filter for browser supplied root certs
    const rootCerts = secInfo.certificates.filter(cert => cert.isBuiltInRoot);
    if (rootCerts.length !== 1) {
        console.error('[WARN] Number of root certs:', rootCerts.length);
        return
    }
    const rootCert = rootCerts[0];

    // BlockingResponse for onHeadersReceived callback
    let response = {}

    // Check if whitelisted
    const requestURL = new URL(requestDetails.url);
    const requestAllowed = config.whitelists.rootIssuer.has(rootCerts.issuer) || config.whitelists.originHost.has(requestURL.host);
    if (config.enabled && !requestAllowed) {
        console.debug(`Root CA denied: ${rootCert.issuer}`);

        const blockedPageURL = browser.runtime.getURL("src/pages/blocked.html");
        const encodedReqURL = encodeURIComponent(requestDetails.url);
        const encodedIssuer = encodeURIComponent(rootCert.issuer);
        const redirectURL = `${blockedPageURL}?originURL=${encodedReqURL}&rootCertIssuer=${encodedIssuer}`;        
        response.redirectUrl = redirectURL;
    }

    return response;
}


// Register web request response listener
const requestFilter = {urls:["<all_urls>"]}
browser.webRequest.onHeadersReceived.addListener(
    headersReceivedCallback,
    requestFilter,
    ["blocking"]
);


// Register message listener (to communicate with blocked.html)
chrome.runtime.onMessage.addListener((payload, completion) => {
    const message = payload.message, data = payload.data;
    console.log('Received message', message, data);
    
    const messages = {
        whitelist_domain: () => {
            config.whitelists.originHost.add(data);
            completion();
        },
        whitelist_issuer: () => {
            config.whitelists.rootIssuer.add(data);
            completion();
        }
    }

    if (message in messages) {
        messages[message]()
    }
})