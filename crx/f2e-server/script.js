;
(function(){
	//chrome.extension.sendMessage({href: location.href});

	if( location.search.match(/listen/) ){
		/*资源更新监听*/
		var doc = document,
			listener = {
			has:function(x){
				return !!this[x];
			},
			listen: function(src){
				var xhr;
				var mtime = "";
				
				src += src.indexOf("?") === -1 ? "?" : "";
				
				if(this.has(src)){
					return false;
				}else{
					this[src] = xhr = new XMLHttpRequest();
				}

				function test(){
					xhr.onreadystatechange = function(){
						if (xhr.readyState == 4 && xhr.status == 200){
							var data = {};
							try{
								data = JSON.parse(xhr.responseText);
								if(mtime && data.modify){
									window.location.reload();
								}else{
									mtime = data.mtime;
								}
								setTimeout(test);
							}catch(e){
								//console.log( src + '\t:\t'+ xhr.responseText );
							}
						}else if(xhr.readyState == 4){
							//setTimeout(test, 200);
						}
					};
					xhr.open("GET", src + "&modify.check=true&mtime="+mtime, true);
					xhr.send();
				}

				test();
				return true;
			}
		};

		var getSrcs = function(){
			var res = [];
			/**
			 * [处理css/js外部引入, 需要判断属性存在以及是否同源]
			 */
			[].forEach.call(doc.styleSheets,function(css){
				if( css.href && css.href.indexOf(location.origin+'/') === 0){
					res.push( css.href );
				}
			});
			[].forEach.call(doc.scripts,function(script){
				if( script.src && script.src.indexOf(location.origin+'/') === 0){
					res.push( script.src )
				}
			});
			return res;
		};

		function cycleListen(){
			var srcList = getSrcs();
			srcList.forEach(function(src){
				if( !listener.has(src) ){
					listener.listen(src);
				}
			});
			setTimeout(cycleListen, 2000);
		}
		listener.listen(location.search); //先把当前页面进行监听
		cycleListen();
	}

	if( location.search.match(/css\W*sprite/) ){
		var style = document.createElement("link");
		style.rel = "stylesheet";
		style.href = chrome.extension.getURL("style.css");
		document.body.appendChild( style );

		var css = document.body.innerText,
			holder = document.createElement("div");
			replacer = [],
			map = {},
			i = 0;
		holder.className = "f2e-crx-holder";
		document.body.appendChild(holder);
		css.replace( /url\("?(.*?)"?\)\s*no\-repeat\s*(-?\w+)?\s*(-?\w+)/g, function(str, src, left, top){
			replacer.push({
				src: src,
				left: parseFloat(left),
				top: parseFloat(top)
			});

			map[ src ] = map[ src ] || (function(src){
				var img = document.createElement("img");
				img.onerror = img.onload = function(){
					i++;
					if( i === Object.keys(map).length ){
						ready();
					}
				};
				img.src = src;
				holder.appendChild( img );
				return img;
			})(src);

			return "{{"+replacer.length+"}}";
		});

		function ready(){
			for( var src in map ){
				console.log( map[src].offsetLeft + " , " + map[src].offsetTop );
			}
		};

	}
	
})();
