let tikuCommon = require("./tikuCommon.js");

let tipsWindow = null;

//显示对号悬浮窗
function drawfloaty(x, y) {
    //floaty.closeAll();
    let window = floaty.window(
        <frame gravity="center">
            <text id="text" text="✔" textColor="red" />
        </frame>
    );
    window.setPosition(x, y - 45);
    return window;
}

function getTimu() {
    let _timu = "";
    //提取题目
    if (className("android.widget.ListView").exists()) {
        _timu = className("android.widget.ListView").findOnce().parent().child(0).text();
        let chutiIndex = _timu.lastIndexOf("出题单位");
        if (chutiIndex != -1) {
            _timu = _timu.substring(0, chutiIndex - 2);
        }
        if (textStartsWith("距离答题结束").exists()) {
            _timu = _timu.substring(2);
        }
        //let timuOld = _timu;
        _timu = _timu.replace(/\s/g, "");
    }
    return _timu;
}

function doChallengeAnswer() {
    let goFlag = false; //判断是否为争上游 true-争上游 false-普通挑战
    if (textStartsWith("距离答题结束").exists()) {
        goFlag = true;
    }
    let _timu = null;
    let answerPointArray = [];
    //获取timu
    _timu = getTimu();
    if (_timu == "") {
        log("题目获取失败");
        //false标志
        return false;
    }

    //提取答案列表选项
    let ansTimu = [];
    if (className("android.widget.ListView").exists()) {
        className("android.widget.ListView").findOne().children().forEach(child => {
            let answer_q = child.child(0).child(1).text();
            if (goFlag) {
                answer_q = answer_q.substring(3);
            }
            ansTimu.push(answer_q);
            //log("坐标点: "+child.child(0).bounds().top);
            answerPointArray.push(child.child(0).bounds().top);
        });
        // log(ansTimu);
    } else {
        log("答案获取失败");
        //false标志
        return false;
    }

    let ansSearchArray = []; //tiku表答案数组
    let answerArray = []; //答案临时数组
    let hasRandom = false;
    //获得答案数组
    if (_timu != "选择词语的正确词形。") {
        ansSearchArray = tikuCommon.searchTiku(_timu);
    } else {
        for (let h = 0; h < ansTimu.length; h++) {
            let queryStr = "SELECT question,answer FROM tiku WHERE question = '选择词语的正确词形。' AND answer ='" + ansTimu[h] + "'";
            ansSearchArray = tikuCommon.searchDb("", "", queryStr);
            if (ansSearchArray.length != 0) {
                break;
            }
        }
    }

    if (ansSearchArray.length == 0) { //tiku表中没有，搜索网络表
        ansSearchArray = tikuCommon.searchNet(_timu);
    } else { //tiku表中有
        answerArray = ansSearchArray;
    }

    if (ansSearchArray.length == 0) { //网络中也没有，随机
        let randomIndex = random(0, ansTimu.length - 1);
        answerArray.push({
            "question": _timu,
            "answer": ansTimu[randomIndex]
        });
        hasRandom = true;
    } else { //tikuNet表中有
        answerArray = ansSearchArray;
    }

    let answer = "";
    //对答案数组逐项点击
    let hasClicked = false;
    let clickAns = "";
    let ansByColor = "";
    // let tipsWindow = null;

    if (answerArray.length > 1) {
        toastLog("答案个数 :" + answerArray.length);
    }
    for (let i = 0, lenAnsArr = answerArray.length; i < lenAnsArr; i++) {
        if (hasClicked == false) { //防止多次点击
            answer = answerArray[i].answer.replace(/(^\s*)|(\s*$)/g, ""); //去除前后空格，解决历史遗留问题
            if (/^[a-zA-Z]{1}$/.test(answer)) { //如果为ABCD形式
                let indexAns = tikuCommon.indexFromChar(answer.toUpperCase());
                answer = ansTimu[indexAns];
            }
            // log("answer :" + answer);
            let listArray = className("ListView").findOnce().children();
            // let clickAns = "";
            //for(ans of answer){//答案数组逐个匹配
            for (let j = 0; j < listArray.length; j++) {
                let item = listArray[j];
                let listStr = item.child(0).child(1).text();
                if (goFlag) {
                    listStr = listStr.substring(3);
                }
                // log("listStr " + j + ": " + listStr);
                if (listStr == answer) {
                    clickAns = answer;
                    log("clickAns= " + clickAns);
                    // 显示 对号
                    let b = item.child(0).bounds();
                    tipsWindow = drawfloaty(b.left, b.top);
                    sleep(100);
                    //延时点击
                    // sleep(delayedTime * 1000);
                    //点击
                    item.child(0).click();
                    hasClicked = true;
                    break;
                }
            }
            if (hasClicked == false) {
                continue;
            }
        }
    }
    //匹配完毕 还未找到答案，需随机点击
    if (hasClicked == false) { //没有点击成功
        // toastLog("请手动点击 " + answer);
        // return false;
        //随机点击
        log("匹配完毕，未发现答案。开始随机点击！");
        let listArray = className("ListView").findOnce().children();
        let randomIndex = random(0, listArray.length - 1);
        let item = listArray[randomIndex];
        let listStr = item.child(0).child(1).text();
        if (goFlag) {
            listStr = listStr.substring(3);
        }
        //答案赋值
        clickAns = listStr;
        log("clickAns= " + clickAns);
        // 显示 对号
        let b = item.child(0).bounds();
        tipsWindow = drawfloaty(b.left, b.top);
        sleep(100);
        //点击
        item.child(0).click();
        hasRandom = true;
        hasClicked = true;
    }

    //截图
    sleep(1300);
    //图像检索正确答案
    threads.start(function () {
        let img = captureScreen();
        for (let k = 0; k < answerPointArray.length; k++) {
            // log("答案"+(i+1)+"处的颜色: "+colors.toString(images.pixel(img,200,answerPointArray[i]+10)));
            // if (images.detectsColor(img, "#f3f3f8", 200, answerPointArray[i]+10)) {
            if (images.detectsColor(img, "#3dc074", 200, answerPointArray[k] + 10)) {
                toastLog("正确答案 " + ansTimu[k]);
                ansByColor = ansTimu[k];
                break;
            }
        };
        img.saveTo("/sdcard/脚本/images.png");
    });

    //关闭悬浮窗
    if (tipsWindow) {
        tipsWindow.close();
    }
    //切题
    sleep(1000);
    //写库
    if (_timu != getTimu()) { //题目变了，代表答对了
        //只要随机了 都插库
        if (hasRandom && clickAns != "") {
            let sqlstr = "INSERT INTO tiku VALUES ('" + _timu + "','" + clickAns + "','')";
            tikuCommon.executeSQL(sqlstr);
        }
    } else { //题干未变化，代表答错了        
        if (ansByColor != "") { //捕获到正确答案
            if (ansSearchArray.length > 0) { //题库中有，但答案是错的
                if (clickAns != "") {
                    let sqlstr = "UPDATE tiku SET answer='" + ansByColor + "' WHERE question='" + _timu + "' AND answer ='" + clickAns + "'";
                    tikuCommon.executeSQL(sqlstr);
                }
            } else { //题库中没有
                let sqlstr = "INSERT INTO tiku VALUES ('" + _timu + "','" + ansByColor + "','')";
                tikuCommon.executeSQL(sqlstr);
            }
        } else { //未捕获到正确答案
            if (hasRandom) { //随机了，说明随机的答案不对
                //答案全入库
                if (ansTimu.length == 2) {
                    for (let iAnsTimu = 0; iAnsTimu < 2; iAnsTimu++) {
                        if (ansTimu[iAnsTimu] != clickAns) {
                            let sqlstr = "INSERT INTO tiku VALUES ('" + _timu + "','" + ansTimu[iAnsTimu] + "','')";
                            tikuCommon.executeSQL(sqlstr);
                        }
                    }
                }
            } else { //没随机，说明答案不正确 
                let ansTimu0 = className("android.widget.ListView").findOne().child(0).child(0).child(1).text();
                if (ansTimu[0] == ansTimu0 && !goFlag) {//答案一样 且 是普通挑战                      
                    let sqlstr = "DELETE FROM tiku WHERE question='" + _timu + "' AND answer ='" + clickAns + "'";
                    tikuCommon.executeSQL(sqlstr);
                }
            }
        }
        //答错了，false标志
        return false;
    }
    return true;
}

function main(isLoop) {
    do {
        try {
            if (text("开始比赛").exists()) {
                click("开始比赛");
                sleep(4000);
            }
            if (text("再来一局").exists()) {
                click("再来一局");
                sleep(4000);
            }
            if (text("继续挑战").exists()) {
                click("继续挑战");
                sleep(1000);
                click("开始比赛");
                sleep(3000);
                while (!textStartsWith("距离答题结束").exists());
            }
            if (text("分享就能复活").exists()) {
                click("分享就能复活");
                sleep(1000);
                back();
                sleep(4000);
            }
            if (doChallengeAnswer() == false) {
                sleep(500);
            }
        } catch (e) {
            //关闭悬浮窗
            if (tipsWindow) {
                tipsWindow.close();
            }
        }
    } while (isLoop);
    // toastLog("停止答题！");
}
// main();
module.exports = main;