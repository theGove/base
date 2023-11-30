const GLOBALS={
  blogger:false
}


async function initialize(platform="web"){
  GLOBALS.blogger=platform==="blogger"
  console.log("document",document)

  add_to_head("script",{
    id:'markdown',
    crossorigin:'anonymous',
    integrity:'sha512-uwSxMaa/W7dmSIXEd07BMVymisMRRUS/Pr5a76AquekKKu9HWn4rBiCd+ZtwqnoijAJvttdrz8krzP26kZjg0Q==',
    referrerpolicy:'no-referrer',
    src:'https://cdnjs.cloudflare.com/ajax/libs/marked/4.2.12/marked.min.js'
  })

  initialize_app()
}    

async function initialize_app(platform="web"){
  // wait to be sure the initialize things have loaded

  if( //typeof firebase==='undefined'      ||
      //typeof Prism?.highlightAll==='undefined' ||
      //typeof sjcl?.encrypt==='undefined' ||
      typeof marked==='undefined' 
      
  ){
    log("caught")
    setTimeout(initialize_app, 100)
    return

  }


  load_js("lib/load_libs")

  // ------------  load interface  ------------------
  load_css("interface/interface.css")
  load_js("interface/interface.js")


  console.log("starting")
  const url_params = get_params()
  console.log("url_params",url_params)

  let page_path=null
  if(url_params.page){
    page_path = url_params.page
  }else{
    page_path="interface/index.html"
  }
  await load_page(page_path)

  // now the interface is loaded, build the table of contents
  const response = await fetch(await get_url(web_path))
  const raw_toc = await response.text();

}


async function get_url(page_path) {
    const page_url = new URL(window.location)

    if (GLOBALS.blogger) {
      console.log ("url",`${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(page_path)}.html`)
      return `${page_url.protocol}//${page_url.host}/2022/02/${await bloggerId(page_path)}.html`
    } else {
      return page_path
    }
  }

function blog_link_handler(evt){
  console.log("at link handler", evt.target.getAttribute("href"))
  const link=evt.target.getAttribute("href")
  if(link.split("?")[0].includes(":")){
    // this is a link with a protocol. just follow it
    return true
  }else if(link.startsWith("/")){
    //this is a absolute path on this site
    load_page(link.substring(1))// get rid of the initial slash because we don't prefix with slash in pageId
  }else{
    // must be a relative path on this site
    // need to have a way to figure the path of the current page
    const current_path=document.body.dataset.pagePath.split("/")
    current_path.pop()
    new_path=link.split("/")

    while(new_path[0]==="."){      
      new_path.shift()
    }

    while(new_path[0]===".."){
      new_path.shift()
      current_path.pop()
    }
    
    load_page(current_path.concat(new_path).join("/"))
  }
  evt.preventDefault();
  return false
  
}

async function get_page_content(page_path){
  const url = await get_url(page_path)
  console.log("url", url)
  const response = await fetch(url)
  return await response.text();  

}

async function load_page(page_path, destination_tag_or_tag_id){
  let raw_page = await get_page_content(page_path);  
  const parser = new DOMParser();
  if (GLOBALS.blogger) {
      const contentDelimiter="==~~--FiLe"+"-"+"CoNtEnTs--~~=="
      raw_page = raw_page.split(contentDelimiter)[1]
      //raw_page = decodeHtml(raw_page)
  }

  const doc = parser.parseFromString(raw_page, "text/html")

  //if (GLOBALS.blogger || true) {
    // add event listener to links on blog
  for(const element of doc.getElementsByTagName('a')) {
      console.log("link handler", element)
      element.onclick = blog_link_handler
  }

  // }

  console.log("doc",doc)
  
  if(document.body){
    // the document has a body tag, replace current body with it
    doc.body.dataset.pagePath=page_path
    //const head=document.head
    
    console.log("doc.body.children",doc.body.children)
    document.body.remove()
    document.head.parentNode.append(doc.body)
    //debugger
  }else{
    tag(destination_tag_or_tag_id).replaceChildren(doc)
  }
  


}

// return the id of a blogger post based on its page_path
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


function get_params(query_string) {
  const page_url = new URL(window.location)
  if (!query_string) {
    query_string = page_url.search
  }
  const url_params_array = query_string.split("?").join("").split("&")
  const url_params = {}

  for (let x = 0; x < url_params_array.length; x++) {
    // returns the params from the url as an object
    const temp = url_params_array[x].split("=")
    url_params[decodeURI(temp[0])] = decodeURI(temp[1])
  }
  return url_params
}
  

/** 
 * gets js that is stored as a base-64 encoded string (if fetched in production) 
 * in a post and loads it to the <header> tag.
 * If the tag already exists, then it will override the js tag with the content of the file. 
 * @param {string} web_path the name of the file we want to get. It gets converted into 
 * a URL.
 */
async function load_js(web_path, script_type) {
  const response = await fetch(await get_url(web_path))
  let source = await response.text();

  if (GLOBALS.blogger) {
    const contentDelimiter="==~~--FiLe"+"-"+"CoNtEnTs--~~=="
    source = atob(source.split(contentDelimiter)[1])
  }
  js_tag_id=web_path.split("/").join("-")
  let js_tag = document.getElementById(js_tag_id)


  if (!js_tag) {
    js_tag = document.createElement(`script`)
    js_tag.setAttribute("id", js_tag_id)
    if(script_type){
      js_tag.setAttribute("type", script_type)
    }else{
      const type_attr = source.match(/@type=["'](.*)['"]@/)
      if (type_attr) {
        js_tag.setAttribute("type", type_attr[1])
      }
    }
    js_tag.async = false;
    document.getElementsByTagName('head')[0].appendChild(js_tag)
  }
  js_tag.addEventListener('load', function() {
    //log("hi hi hi");
  });

  js_tag.replaceChildren(source)
}



async function add_to_head(tag_name, attributes) {
  // place a tag in the document header with the specified attributes
  let tag_id_header = document.getElementById(attributes.id)
  if (!tag_id_header) {
    tag_id_header = document.createElement(tag_name)
    for(const [attr_name, attr_val] of Object.entries(attributes)){
      tag_id_header.setAttribute(attr_name, attr_val)
    }
    document.head.appendChild(tag_id_header)
  }
}

function decodeHtml(input) {
  var doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
}

// send a tag or the id of the tag.  returns the relevant tag
function tag(tag_or_id) {
  if(typeof tag_or_id === 'string'){
    return document.getElementById(tag_or_id)
  }else{
    return tag_or_id
  }
}


async function load_css(web_path) {
  // gets css that is stored in a post and load it

  const response = await fetch(await get_url(web_path))
  let source = await response.text();
  if(GLOBALS.blogger){
    const contentDelimiter="==~~--FiLe"+"-"+"CoNtEnTs--~~=="
    source = decodeHtml(source.split(contentDelimiter)[1])
  
  }
  
  const css = document.createElement(`style`)
  css.innerHTML = source
  document.head.appendChild(css)
}

function log(...args){
  // use this to log only in development mode
  if(!globalThis.blogger)console.log(...args)
  //console.log(...args)
}
