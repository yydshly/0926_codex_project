// Rebuild the original vector diagram. PNG rendering is recorded in verification.md.
const fs = require('node:fs');
const path = require('node:path');
const W = 2560, H = 2710;
const C = { ink:'#19333e', muted:'#4e6873', line:'#cad8de', paper:'#f4f8fa', white:'#ffffff', green:'#c3ed9c', teal:'#176453', tealPale:'#eaf5ee', blue:'#245f8f', bluePale:'#eef5fb', orange:'#a44823', orangePale:'#fcf2eb' };
const out = [];
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function rect(x,y,w,h,fill=C.white,stroke=C.line,r=16){out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);}
function line(x1,y1,x2,y2,color=C.line,width=2,dash=''){out.push(`<path d="M${x1},${y1} L${x2},${y2}" fill="none" stroke="${color}" stroke-width="${width}"${dash?` stroke-dasharray="${dash}"`:''}/>`);}
function arrow(d,color=C.teal,dash=false){out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="3"${dash?' stroke-dasharray="9 7"':''} marker-end="url(#${color===C.orange?'arrowOrange':color===C.blue?'arrowBlue':'arrowTeal'})"/>`);}
let textId=0;
function text(x,y,lines,size=28,color=C.ink,width=1000,weight=400,lh=Math.round(size*1.5)){
  if(!Array.isArray(lines)) lines=[lines];
  out.push(`<text id="t${++textId}" data-max-width="${width}" x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?lh:0}">${esc(s)}</tspan>`).join('')}</text>`);
}
function label(x,y,number,title,color=C.teal,width=1000){text(x,y,number,24,color,60,600);text(x+60,y+1,title,34,C.ink,width-60,700);}
function item(x,y,title,body,width=510){text(x,y,title,29,C.ink,width,650);text(x,y+43,body,25,C.muted,width,400,35);}
function link(x,y,label,url,width=1000){out.push(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">`);text(x,y,label,22,C.blue,width,500);out.push('</a>');}

out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="mapTitle mapDesc"><title id="mapTitle">Hindsight 理解全景图：输入、内部原理、数据库、输出、场景、扩展与个人研究闭环</title><desc id="mapDesc">Hindsight 是建立在 PostgreSQL 等数据库上的长期记忆服务。应用送入带来源的资料，retain 提取事实，记忆库存储原文、经历、归纳与专题知识，recall 多路检索，reflect 综合证据；采集、权限、业务执行和核验由外部应用负责。本图还展示个人 GitHub 研究的持续分析闭环、六类使用场景及六个可扩展方向。图中为研究解释和建议，不是运行结果。</desc><defs>${[['arrowTeal',C.teal],['arrowOrange',C.orange],['arrowBlue',C.blue]].map(([id,c])=>`<marker id="${id}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 Z" fill="${c}"/></marker>`).join('')}</defs><g font-family="Microsoft YaHei, Noto Sans SC, Segoe UI, sans-serif">`);
rect(0,0,W,H,C.paper,C.paper,0);
text(64,62,'012 / OPEN-SOURCE RESEARCH',24,C.teal,1100,600);
text(64,135,'Hindsight 理解全景图',62,C.ink,1700,750);
text(64,192,'把你研究过的 GitHub 库，变成有来源、会更新、可持续分析的个人知识库',31,C.muted,2432,400);
text(2030,62,'2026.09.26 · 研究整理',24,C.muted,466,500);
rect(1750,91,222,49,C.tealPale,C.teal,9);text(1771,124,'原库已有能力',25,C.teal,180,600);
rect(1994,91,245,49,C.orangePale,C.orange,9);text(2016,124,'应用负责接入',25,C.orange,200,600);
rect(2261,91,235,49,C.bluePale,C.blue,9);text(2283,124,'研究应用建议',25,C.blue,193,600);

const essenceX=[64,885,1706];
essenceX.forEach(x=>rect(x,235,790,205,C.white,C.line));
text(92,282,'核心本质：AI 的外部长期记忆层',32,C.ink,734,700);
text(92,331,['组织事实、经历、关系和时间','检索证据，归纳认识，再辅助判断'],28,C.muted,734,400,41);
text(92,415,'“学习”是更新记忆，不是训练模型权重',26,C.teal,734,550);
text(913,282,'数据库：你的内容，它管理结构',32,C.ink,734,700);
text(913,331,['主后端 PostgreSQL；支持自托管或托管','Bank 是逻辑记忆库，可按项目或用户组织'],28,C.muted,734,400,41);
text(913,415,'Bank 不等于独立数据库；访问权限仍需配置',26,C.teal,734,550);
text(1734,282,'分工：数据库、模型、你的应用',32,C.ink,734,700);
text(1734,331,['数据库保存；模型完成抽取、归纳与推理','Hindsight 编排记忆；应用采集资料、执行任务'],28,C.muted,734,400,41);
text(1734,415,'它不自动抓取全网，也不自动证实所有信息',26,C.orange,734,550);

rect(64,490,430,1030,C.white,C.line);
rect(530,490,1440,1030,'#eaf1f4',C.line);
rect(2006,490,490,1030,C.white,C.line);
label(92,548,'01','写入的输入',C.orange,374);
text(92,588,'你的资料 ＋ 来源信息',25,C.muted,374);
label(562,548,'02','内部核心：构建记忆，再按问题调用',C.teal,1376);
text(562,588,'以下是模块与知识层次示意，不是数据库物理表结构',25,C.muted,1376);
label(2034,548,'03','查询与输出',C.blue,434);
text(2034,588,'由具体问题驱动',25,C.muted,434);

item(92,656,'上游资料',['README、文档、源码摘录','版本、许可证、更新记录'],374);
line(92,745,466,745);
item(92,793,'你的研究',['能力分析、架构理解','跨库比较、选型理由'],374);
line(92,882,466,882);
item(92,930,'你的实践',['环境、步骤、真实结果','失败原因、反馈与纠正'],374);
rect(88,1042,382,192,C.orangePale,'#e7c8b6',10);
text(110,1084,'建议随资料一起保留',26,C.orange,338,650);
text(110,1126,['仓库 / 文件位置 / commit','日期 / 项目 / 验证状态','官方声明、实测与推测分开'],24,C.muted,338,400,35);
rect(88,1270,382,215,C.paper,C.line,10);
text(110,1312,'接入由应用负责',27,C.orange,338,650);
text(110,1357,['采集、增量同步、去重','通过 SDK / REST / MCP 写入','无需先手工建完整知识图谱','原始资料继续留在 Git 中'],24,C.muted,338,400,34);

rect(562,625,386,265,C.white,C.teal);
text(588,670,'Retain / 写入',32,C.teal,334,700);
text(588,720,['分块 → 叙述事实抽取','实体识别与名称归一','发生时间 ≠ 录入时间','保留上下文与来源'],26,C.ink,334,400,43);
rect(992,625,458,664,C.ink,C.ink);
text(1018,672,'Memory Bank',36,C.white,406,700);
text(1018,711,'主要持久化：PostgreSQL',25,'#cae0e7',406,450);
line(1018,738,1424,738,'#58727c');
text(1018,781,'原文与片段',29,C.green,406,650);text(1018,822,'保留材料，便于回溯核对',25,'#d9e5e9',406);
text(1018,884,'事实 world / 经历 experience',25,C.green,406,650);text(1018,925,'提取后的叙述、实体与时序',25,'#d9e5e9',406);
text(1018,989,'归纳认识 Observations',28,C.green,406,650);text(1018,1030,'关联依据，随新证据修正',25,'#d9e5e9',406);
text(1018,1094,'专题知识 Mental Models',28,C.green,406,650);text(1018,1135,'为固定问题维护可刷新的答案',25,'#d9e5e9',406);
line(1018,1170,1424,1170,'#58727c');
text(1018,1215,['索引：向量 / 全文 / 图关系','元数据：时间 / 标签 / 来源'],25,'#d9e5e9',406,400,39);
rect(1494,625,444,250,C.white,C.teal);
text(1520,670,'Recall / 检索',32,C.teal,392,700);
[['语义相似',1520,698],['关键词',1727,698],['图关系',1520,757],['时间范围',1727,757]].forEach(([s,x,y])=>{rect(x,y,185,47,C.tealPale,C.tealPale,7);text(x+16,y+32,s,25,C.teal,153,550);});
text(1520,850,'融合 → 重排 → 上下文预算',26,C.ink,392,500);
rect(562,965,386,324,C.white,C.teal);
text(588,1012,'后台归纳 / 更新',30,C.teal,334,700);
text(588,1060,['相关事实 → 归纳认识','新证据可支持或修正','旧认识保留变迁依据','专题知识可按规则刷新'],26,C.ink,334,400,42);
text(588,1239,['自动归纳记录中的认识；','专题问题与更新规则由你定义。'],22,C.muted,334,400,31);
rect(1494,965,444,324,C.white,C.teal);
text(1520,1012,'Reflect / 反思',32,C.teal,392,700);
text(1520,1060,['先查专题知识与归纳','必要时追查原始记忆','多轮工具调用 → 综合回答','返回使用到的记忆依据'],26,C.ink,392,400,42);
text(1520,1256,'引用可追溯 ≠ 内容已证真',25,C.orange,392,550);
arrow('M494,735 L560,735',C.orange);
arrow('M948,735 L990,735');
arrow('M1450,735 L1492,735');
arrow('M755,890 L755,963',C.teal,true);text(773,936,'新事实',22,C.teal,158);
arrow('M948,1126 L990,1126',C.teal,true);
arrow('M1716,875 L1716,963');text(1736,930,'证据',22,C.teal,146);
arrow('M1450,1092 L1492,1092');
rect(562,1325,1376,159,C.white,C.line,10);
text(588,1367,'你配置的模型能力',28,C.ink,850,650);
text(588,1414,'LLM：抽取 / 归纳 / 推理     Embedding：语义表示     Reranker：候选重排',26,C.muted,1324);
text(588,1460,'可选择云端或本地模型；质量、延迟与费用受配置和数据规模影响。',25,C.muted,1324);

rect(2030,625,442,264,C.bluePale,'#b9cfdf',10);
text(2054,671,'查询输入',29,C.blue,394,650);
text(2054,718,['问题 ＋ 记忆范围 ＋ 预算','例如：以前为什么放弃 A？','哪些库可组合解决新需求？'],26,C.ink,394,400,43);
text(2054,861,'通过 recall / reflect 查询',24,C.blue,394,550);
arrow('M2030,788 L1940,788',C.blue);
text(2034,970,'你能得到',29,C.blue,434,700);
const outputRows=[['Recall → 相关记忆','返回事实、经历与原文线索'],['Reflect → 分析回答','综合已有证据，说明依据'],['Mental Models → 专题知识','项目现状、偏好、经验手册'],['Agent 上下文','支持下一轮回答或任务决策']];
outputRows.forEach(([title,body],i)=>{const y=1027+i*96;text(2034,y,title,28,C.ink,434,650);text(2034,y+37,body,24,C.muted,434);});
arrow('M1938,850 L1979,850 L1979,1027 L2004,1027');
arrow('M1938,1138 L2004,1138');
line(2034,1394,2468,1394);
text(2034,1437,'后续执行与核验仍由你或应用完成',24,C.orange,434,550);
text(2034,1478,'分析建议不等于已经完成业务动作',24,C.muted,434);

rect(64,1555,2432,322,C.tealPale,'#b7d4c3');
text(96,1610,'对你的意义：把 GitHub 研究积累变成自己的持续分析能力',38,C.ink,2368,700);
text(96,1653,'先从已有 README、研究笔记和验证记录开始；原文仍保留在 Git，记忆层帮助查找、联结和重新评估。',27,C.muted,2368);
const steps=[['已有研究','README / 笔记 / 实测'],['带证据入库','仓库 / 版本 / 日期 / 等级'],['持续分析','找库 / 比较 / 组合 / 溯源'],['核查与实践','回到原文 / 运行验证'],['确认后写回','新事实 / 新限制 / 新经验']];
steps.forEach(([title,body],i)=>{const x=100+i*478;rect(x,1687,435,106,C.white,'#b7d4c3',10);text(x+22,1728,title,30,C.teal,391,650);text(x+22,1772,body,24,C.muted,391);if(i<4)arrow(`M${x+435},1740 L${x+476},1740`);});
arrow('M2229,1793 L2229,1846 L796,1846 L796,1795',C.teal,true);
rect(1050,1819,955,50,C.tealPale,C.tealPale,0);text(1080,1851,'新证据回流；分析推测继续标为推测，不自动升级为事实',25,C.teal,895,550);

rect(64,1910,1196,465,C.white,C.line);
rect(1292,1910,1204,465,C.white,C.line);
text(96,1965,'使用场景',35,C.ink,1132,700);
text(96,2008,'长期对象 × 持续变化 × 经验复用',26,C.muted,1132);
text(1324,1965,'可扩展方向',35,C.ink,1140,700);
text(1324,2008,'以下需要你接入或实现，不是已经完成的业务系统',26,C.blue,1140);
const scenarios=[['个人技术研究','跨库比较、回看选型理由'],['研发与排障','复用有适用条件的修复经验'],['长期项目协作','保留需求变化与决策来由'],['客户服务与跟进','连续理解诉求、承诺与进展'],['学习与辅导','根据历史表现安排复习'],['重复任务 Agent','执行前查经验，结束后记结果']];
const extensions=[['增量采集与同步','GitHub、笔记、工单、版本更新'],['证据分级与溯源','官方声明 / 源码 / 实测 / 推测'],['经验变成操作手册','条件 → 步骤 → 结果 → 验收'],['多助手与团队共享','授权、分层记忆、跨库编排'],['领域化与中文优化','抽取规则、嵌入、重排、分词'],['质量与生命周期','纠错、过期、删除、成本评测']];
scenarios.forEach(([title,body],i)=>item(96+(i%2)*579,2071+Math.floor(i/2)*106,title,body,540));
extensions.forEach(([title,body],i)=>item(1324+(i%2)*582,2071+Math.floor(i/2)*106,title,body,546));

rect(64,2410,2432,190,C.ink,C.ink);
text(96,2463,'采用时守住三个边界',33,C.white,2368,650);
[['证据质量','归纳可能出错；必须能回到原文核对'],['更新与权限','定期采集、跨库授权，需要应用安排'],['成本与收益','中文链路单独验证，先做小规模对照试验']].forEach(([title,body],i)=>{const x=96+i*796;text(x,2511,title,27,C.green,760,650);text(x,2555,body,25,'#d9e5e9',760);});
text(64,2644,'研究图解，不是官方架构图或原库运行结果。原项目：Vectorize AI, Inc. 与贡献者 · MIT · 研究快照 a921929a0e0e',22,C.muted,2432);
link(64,2682,'[1] 原仓库', 'https://github.com/vectorize-io/hindsight',200);
link(290,2682,'[2] 写入与检索', 'https://hindsight.vectorize.io/developer/retain',240);
link(560,2682,'[3] 存储架构', 'https://hindsight.vectorize.io/developer/storage',220);
link(810,2682,'[4] 归纳与反思', 'https://hindsight.vectorize.io/developer/observations',240);
link(1080,2682,'[5] 专题知识', 'https://hindsight.vectorize.io/developer/mental-models',220);
link(1330,2682,'[6] 扩展接口', 'https://hindsight.vectorize.io/developer/extensions',220);
text(1800,2682,'资料核验 / 原创制图：本研究仓库',22,C.muted,696);
out.push('</g></svg>');
const svg=out.join('\n');
const projectAssets=path.join(__dirname,'assets');
const siteAssets=path.resolve(__dirname,'../../sites/012-hindsight/assets');
fs.mkdirSync(projectAssets,{recursive:true});fs.mkdirSync(siteAssets,{recursive:true});
fs.writeFileSync(path.join(projectAssets,'understanding-map.svg'),svg,'utf8');
fs.writeFileSync(path.join(siteAssets,'understanding-map.svg'),svg,'utf8');
console.log(JSON.stringify({width:W,height:H,textBlocks:textId,files:['projects/012-hindsight/assets/understanding-map.svg','sites/012-hindsight/assets/understanding-map.svg']}));
