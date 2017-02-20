"use strict";
var fs = require("fs"),
    path = require("path"),
    mime = require("mime"),    //MIME类型
    _ = require("underscore");

function includeFile (filePath, type) {
    switch (type) {
        case 'base64':
            return 'data:' + mime.get(filePath) + ';base64,' + new Buffer(fs.readFileSync(filePath)).toString('base64'); 
        default:
            return fs.readFileSync(filePath,'utf-8');
    }
}

exports.execute = function(req, resp, root, str, mini, debug, conf){
    var belong = "",
        include = new RegExp(conf.include, 'g'),
        pathname = path.join(root, req.$.title).replace(/[^\\\/]+$/,"");
    var h = new RegExp(conf.belong).exec(str),
        inc;
    try{

        if(conf.runJsBefore){try{ //模板引擎渲染前置
            if( !conf.template || !conf.template.get || (conf.template.filter && !conf.template.filter.test(req.$.title) ) ){
                var compiled = _.template(str);
                str = compiled({request: req, response: resp, require: require});
            }else{
                str = conf.template.get(str, req.$.title, req, resp, require);
            }
        }catch(compileError){
            console.trace(compileError);
            console.trace(req.$.title + ": 模板引擎渲染异常！ ");
        }}

        if(h){
            belong = fs.readFileSync( /^[\/\\]/.test(h[1]) ? path.join(root,h[1]) : path.join(pathname,h[1]), 'utf-8' );    //读取belong文本
            str = str.replace(h[0], "" );              //替换关键字
            str = belong.replace(conf.placeholder,str);
        }
        
        while (str.match(include)) {
            str = str.replace(include, function (all, filename, type) {
                return includeFile( /^[\/\\]/.test(filename) ? path.join(root, filename) : path.join(pathname, filename), type);
            });
        }

        // 需要设置重命名
        str = require("./rename").execute(req, resp, root, str, mini, debug, conf);

        var result = str;
        if(conf.runJs){try{ //模板引擎渲染
            if( !conf.template || !conf.template.get || (conf.template.filter && !conf.template.filter.test(req.$.title) ) ){
                var compiled = _.template(str);
                result = compiled({request: req, response: resp, require: require});
            }else{
                result = conf.template.get(str, req.$.title, req, resp, require);
            }
        }catch(compileError){
            console.trace(compileError);
            console.trace(req.$.title + ": 模板引擎渲染异常！ ");
        }}

        switch(typeof result){
            case "function": result(); return;
            case "string":
            default :
                mini.get(req.$.title, debug)(result,resp,conf);
        }
    }catch(e){
        resp.writeHead(500, {"Content-Type": "text/html"});
        resp.end( e.stack.toString().replace(/\n/g,"<br>") );
    }
};
