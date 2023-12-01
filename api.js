const GLOBALS={
    blogger:false
  }
  

const Slick = {
    /**
     * Adds and listener for the message event. You should only call this method once.
     * @param {(event: MessageEvent<*>)=> Object.<string, any>} handlerCallback 
     */
    createReceiver(handlerCallback) {
        window.addEventListener("message",
            event => {
                try {
                    const data = handlerCallback(event)
                    event.source.postMessage({ ...data, __slick_id__: event.data.__slick_id__ }, event.origin)
                } catch (error) {
                    event.source.postMessage({ __slick_error__: error, id: event.data.id }, event.origin)
                }
            }
        );
    },

    /**
     * An object that has the post method, used for making cross origin requests across i-frames. 
     */
    requester: function () {
        const requests = {}
        window.addEventListener(
            "message",
            (e) => {
                if (requests[e.data.__slick_id__]) {
                    if (e.data.__slick_error__) {
                        requests[e.data.__slick_id__].reject(e.data.__slick_error__)
                    } else {
                        requests[e.data.__slick_id__].resolve(e.data)
                    }
                }
            },
        );
        return {
            async post(contentWindow, data, origin = "*") {
                const __slick_id__ = Math.random()
                const promise = new Promise((resolve, reject) => {
                    requests[__slick_id__] = { resolve, reject }
                })
                contentWindow.postMessage({ ...data, __slick_id__ }, origin)
                const result = await promise
                delete requests[__slick_id__]
                return result
            }
        }
    }()
}

function initialize(platform="web"){
    GLOBALS.blogger=platform==="blogger"

    Slick.createReceiver(async event=>{
        console.log("api-data", event.data)
        if(event.data.mode==="get-page"){
            console.log("getting page")
            // this is a request for a page
            response = await fetch(await get_url(event.data.web_path))
            return  await response.text();
    
        }

        
        return {
            message: "Blogger API: " + event.data.a,
            value: 1,
            cool: true
        }
    })
    document.body.replaceChildren("Book API")
}




/////////////////////////////copied functions///////////////////////////

async function get_url(page_path) {
    const page_url = new URL(window.location)

    if (GLOBALS.blogger) {
      console.log ("url",page_path,`${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(page_path)}.html`)
      return `${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(page_path)}.html`
    } else {
      return page_path
    }
}


async function bloggerId(page_path) {
    const msgUint8 = new TextEncoder().encode(page_path); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8); // hash the page_path
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""); // convert bytes to hex string
    let hash36=""    
    // encode blocks of 10 characters at a time to base 36
    for(let x=0;x<4;x++){
      hash36+=parseInt(hashHex.substring(x*10, x*10+10),16).toString(36)
    }
    return hash36;
  }
  