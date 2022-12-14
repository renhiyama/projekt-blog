//find all script tags with code attribute
let scripts = document.querySelectorAll('script[code]');
//unescape function unescapes html entities
let unescaped = function (str) {
  return str.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};
//loop through each script tag
scripts.forEach(function(script) {
  //get the code attribute
  let code = script.getAttribute('code');
  //create a new script tag
  let newScript = document.createElement('script');
  //set the innerHTML of the new script tag to the code attribute
  newScript.innerHTML = unescaped(code);
  //replace the old script tag with the new one
  script.replaceWith(newScript);
});
