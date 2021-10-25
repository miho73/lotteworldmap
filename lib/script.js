'use strict'

const s = document.getElementById('lw-path');

let wps = [];
let link = [];

let nWps = 0;

let scrMode = 0;

window.addEventListener('resize', () => {
    if(scrMode == 0) renderWPS();
    else if (scrMode == 1) renderPath();
    else if (scrMode == 2) mark(marking);
});

function report(event) {
    let ww = map.width, wh = map.height;
    if(document.getElementById('locate').checked) {
        let x = Math.round(event.clientX*1300/ww);
        let y = Math.round(event.clientY*900/wh);
        let dist=987654321, wp = -1, cnt = 0;
        wps.forEach((w)=>{
            let d = (x-w[0])**2 + (y-w[1])**2;
            if(d<dist) {
                dist = d;
                wp = cnt;
            }
            cnt++;
        });
        document.getElementById('log').innerText = 'Nearest waypoint from ('+x+', '+y+') is '+wp+'.';
        return;
    }
    wps.push([
        Math.round(event.clientX*1300/ww),
        Math.round(event.clientY*900/wh)
    ]);
    if(nWps != 0) {
        link.push([nWps-1]);
        link[nWps-1].push(nWps);
    }
    else link.push([]);
    document.getElementById('log').innerText = 'Marked waypoint '+nWps;
    renderWPS();
    nWps++;
}
window.addEventListener('contextmenu', e => {
    e.preventDefault();
    wps.pop();
    link.pop;
    nWps--;
    renderWPS();
});

function loadWPS() {
    $.ajax({
        type: 'POST',
        url: '/wps',
        data: {
            floor: 'b1'
        },
        success: function(data) {
            wps = data.wps;
            link = data.link;
            nWps = wps.length;
            document.getElementById('log').innerText = 'Loaded '+wps.length+' / '+link.length+' waypoints';
            renderWPS();
        },
        error: function(err) {
            console.log(err);
        }
    });
}

const map = document.getElementById('lw-map');
function renderWPS() {
    let path = '';
    let ww = map.width, wh = map.height;
    let cnt = 0, marking = '';
    if(document.getElementById('mark').checked) {
        marking = 'h1v1h-2v-2h2v1h-1'
    }
    wps.forEach((wp)=>{
        path+='M' + Math.round(wp[0]*ww/1300) + ',' + Math.round(wp[1]*wh/900)+marking;
        let links = link[cnt];
        links.forEach((lnk)=>{
            path += 'L'+Math.round(wps[lnk][0]*ww/1300) + ',' + Math.round(wps[lnk][1]*wh/900) + 'M' + Math.round(wp[0]*ww/1300) + ',' + Math.round(wp[1]*wh/900);
        });
        cnt++;
    });
    s.setAttribute('d', path);
    scrMode = 0;
}

const nLnkCd = document.getElementById('lw-new-lnk-for');
const nLnk = document.getElementById('lw-new-lnk');
let marking;

function mark(wp) {
    wp = parseInt(wp);
    marking = wp;
    nLnkCd.value = wp;
    nLnk.value = link[wp].join(',');
    let ww = map.width, wh = map.height;
    let links = link[wp];
    let path = 'M' + Math.round(wps[wp][0]*ww/1300) + ',' + Math.round(wps[wp][1]*wh/900)+'h4v4h-8v-8h8v4h4';
    let linkInv = [];
    links.forEach((lnk)=>{
        path += 'M' + Math.round(wps[wp][0]*ww/1300) + ',' + Math.round(wps[wp][1]*wh/900) + 'L'+Math.round(wps[lnk][0]*ww/1300) + ',' + Math.round(wps[lnk][1]*wh/900);
        if(!link[lnk].includes(wp)) {
            linkInv.push(lnk);
        }
    });
    if(linkInv.length == 0) document.getElementById('log').innerText = 'Showing waypoint '+wp+'. Link OK';
    else document.getElementById('log').innerText = 'Showing waypoint '+wp+'. Link Error: '+linkInv.join(', ');
    s.setAttribute('d', path);
    scrMode = 2;
}

function updateLnk() {
    let wp = parseInt(nLnkCd.value);
    let strArr = []
    if(nLnk.value != '') strArr = nLnk.value.split(',');
    let intArr = [];
    strArr.forEach((a)=>{
        intArr.push(parseInt(a));
    })
    link[wp] = intArr;
    document.getElementById('log').innerText = 'Updated link for waypoint '+wp+' to '+link[wp];
}

function expo() {
    let json = {};
    json['wps'] = wps;
    json['link'] = link;
    navigator.clipboard.writeText(JSON.stringify(json));
    document.getElementById('log').innerText = 'Copied waypoint data to clipboard';
}

function confLnkErr() {
    let linkInv = [], sameRef = [], wp = 0, errCnt = 0;
    link.forEach((links)=>{
        links.forEach((lk)=>{
            if(lk == wp) {
                sameRef.push(wp);
                errCnt++;
            }
            else if(!link[lk].includes(wp)) {
                linkInv.push([wp, lk]);
                errCnt++;
            }
        });
        wp++;
    });
    if(errCnt == 0) {
        document.getElementById('log').innerText = 'No error was found.';
        document.getElementById('console').value = 'No error was found.\n';
    }
    else {
        document.getElementById('log').innerText = 'Found '+errCnt+' errors. Check out console.';
        let log = '';
        linkInv.forEach((error)=>{
            log += (error[0]+' linked with '+error[1]+' but the opposite is not.');
        });
        sameRef.forEach((error)=>{
            log += (error+': recursive link');
        });
        document.getElementById('console').value = log;
    }
}

// PATH FINDER

class Queue {
    constructor() {
        this._arr = [];
    }
    push(item) {
        this._arr.push(item);
    }
    pop() {
        return this._arr.shift();
    }
    empty() {
        return ((this._arr.length == 0) ? true : false);
    }
}

const INF = 987654321;
let d = [];
let path = '';
let pathfrom, pathto;

function go(from, to) {
    d = [];
    path = '';
    for(let i=0; i<=wps.length; i++) {
        d.push(INF);
    }
    d[from] = 0;
    let q = new Queue();
    q.push([from, 0, '']);
    while(!q.empty()) {
        let pt = q.pop();
        link[pt[0]].forEach((got)=>{
            if(d[got] > pt[1]+1) {
                d[got] = pt[1]+1;
                q.push([got, d[got], pt[2]+'/'+got]);
                if(got == to) {
                    path = pt[2]+'/'+got;
                }
            }
        });
    }
}

function pathfind() {
    let from = parseInt(document.getElementById('from').value); pathfrom = from;
    let to = parseInt(document.getElementById('to').value); pathto = to;
    go(from, to);
    if(d[to] == INF) {
        document.getElementById('log').innerText = 'Cannot reach from '+from+' to '+to;
    }
    else {
        document.getElementById('log').innerText = 'Minimum waypoints from '+from+' to '+to+' is '+d[to];
        document.getElementById('console').value = 'Minimum waypoints from '+from+' to '+to+' is '+d[to]+'\n'+'Path: '+path;
        renderPath();
    }
}

function renderPath() {
    let waypts = path.substr(1, path.length-1).split('/');
    let spath = '', cnt = true;
    let ww = map.width, wh = map.height;
    waypts.forEach((wayp) => {
        if(cnt) {
            spath+='M'+Math.round(wps[wayp][0]*ww/1300)+','+Math.round(wps[wayp][1]*wh/900);
            cnt = false;
        }
        else spath+='L'+Math.round(wps[wayp][0]*ww/1300)+','+Math.round(wps[wayp][1]*wh/900);
    });
    s.setAttribute('d', spath);
    scrMode = 1;
}