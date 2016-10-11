/*
 * Emmet の Update Image が使用できなかったので作成。
 * 本家が実装されるまでのつなぎにでもどうぞ。
 */
define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var EditorManager   = brackets.getModule("editor/EditorManager"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        Menus           = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        UPDATE_IMAGE_SIZE  = "update_image_size";
    
    // shortcut
    var shortcut = [{
            key: "Ctrl-i"
        }, {
            key: "Ctrl-i",
            platform: "mac"
        }];

    var _process = {

        // chがどのimgタグ内にあるか判別
        currentImgTagCheck: function(hostEditor, pos){

            // imgタグ内外を判別　スマートなやり方ないものか(´・ω・`)
            var token = hostEditor._codeMirror.getTokenAt(pos, true);
            if( token.string === ">" || token.string === "/>" ){
                return null;
            }else if( token.type === null ){
                token = hostEditor._codeMirror.getTokenAt({line: pos.line, ch: token.end + 1}, true);
                if( token.type === null || ( token.type === "tag bracket" && token.string === "<" ) ){
                    return null;
                }
            }

            // get fileName / width,height range 取得
            var line = hostEditor._codeMirror.getLineTokens(pos.line, true),
                l    = line.length,
                i    = 0,
                ch   = 0,
                fileName = "",
                widthRange = "",
                heightRange = "";

            while( i <= l ){
                if( line[i].type === "tag" && line[i].string === "img" ){
                    // reset
                    fileName = "",
                    widthRange = "";
                    heightRange = "";
                }else if( line[i].type === "attribute" && line[i].string === "src" ){
                    fileName = [line[i+2].string, line[i+2].end];
                }else if( line[i].type === "attribute" && line[i].string === "width" ){
                    widthRange = [line[i+2].string, line[i+2].start, line[i+2].end];
                }else if( line[i].type === "attribute" && line[i].string === "height" ){
                    heightRange = [line[i+2].string, line[i+2].start, line[i+2].end];
                }else if( line[i].string === ">" || line[i].string === "/>" ){
                    if( ch >= pos.ch ) break;
                }

                //console.log("pos.ch:", pos.ch," ch:", ch, " str:", line[i].string);

                i++;
                ch = line[i].start;
            }

            return [fileName, widthRange, heightRange];
        },

        // img width,height 取得
        getDemension: function(imgPath, imgArr){
            var img = new Image();
            img.src = imgPath;
            img.onload = function () {
                var imgSize = ["\""+this.width+"px\"", "\""+this.height+"px\""];
                _process.replaceImageSize(imgSize, imgArr);
            };
        },

        // img width,height 置換
        replaceImageSize: function(imgSize, imgArr){
            var currentDoc = DocumentManager.getCurrentDocument();
            var editor = EditorManager.getFocusedEditor();
            var pos = editor.getCursorPos(true);
            
            var imgW,imgH, 
                imgH_org = "";

            // height update
            if( imgArr[2] !== ""){
                imgH = imgSize[1];
                imgH_org = imgArr[2][0];
                currentDoc.replaceRange(imgH, {line: pos.line, ch: imgArr[2][1]}, {line: pos.line + 0, ch: imgArr[2][2]});
            }else{
                imgH = " height=" + imgSize[1];
                currentDoc.replaceRange(imgH, {line: pos.line, ch: imgArr[0][1]});
            }
            
            // height update での ch のズレを補正
            var x = ( imgArr[1][1] < imgArr[2][1] )? 0 : imgH.length - imgH_org.length;

            // width update
            if( imgArr[1] !== ""){
                imgW = imgSize[0];
                currentDoc.replaceRange(imgW, {line: pos.line, ch: imgArr[1][1] + x}, {line: pos.line + 0, ch: imgArr[1][2] + x});
            }else{
                imgW = " width=" + imgSize[0];
                currentDoc.replaceRange(imgW, {line: pos.line, ch: imgArr[0][1] });
            }
        }
    };

    var _updateImgSize = function(){
        mainProcess( EditorManager.getCurrentFullEditor(), EditorManager.getCurrentFullEditor().getCursorPos() );
    }
    function mainProcess(hostEditor, pos){

        // get filename / width,height Range
        var imgArr = _process.currentImgTagCheck(hostEditor, pos);
        if( imgArr === false ){
            return null;
        }

        // fileName
        var fileName = imgArr[0][0];

        // 先頭・末尾の「"」「'」を削除
        var ch = fileName[0];
        if( ch === "\"" || ch === "'" ){
            fileName = fileName.substr(1);
        }

        var l = fileName.length;
        ch = fileName[l-1];
        if( ch === "\"" || ch === "'" ){
            fileName = fileName.substr(0, l-1);
        }

        // check fileName
        if( !/(.png|.jpg|.jpeg|.gif|.svg)$/i.test(fileName) ){
            return null;
        }

        // get&replace img size
        var currentDoc = DocumentManager.getCurrentDocument();
        var filePath = currentDoc.file.fullPath.substr(0,currentDoc.file.fullPath.lastIndexOf("/"));
        _process.getDemension(filePath + "/" + fileName, imgArr);

        var result = new $.Deferred();
        return result.promise();
    }

    // Register commands 
    var buildMenu = function(m){
        m.addMenuDivider();
        m.addMenuItem(UPDATE_IMAGE_SIZE);
    };

    CommandManager.register("Update imageSize", UPDATE_IMAGE_SIZE, _updateImgSize);
    
    var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    if( menu ){
        menu.addMenuItem(UPDATE_IMAGE_SIZE, shortcut);
    }
    buildMenu(menu);
    
    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    buildMenu(contextMenu);

});