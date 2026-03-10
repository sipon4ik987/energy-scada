// MeterTree.jsx — Hierarchical tree visualization of TP-1913 electricity meters
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const FN = `'JetBrains Mono','Fira Code',monospace`;

// ═══ COLOR SCHEME ═══
const CLR_BG = "#0a1929";
const CLR_ROOT = "#ffd600";
const CLR_FEEDER = "#00e5ff";
const CLR_SECTION = "#76ff03";
const CLR_SUBSECTION = "#ff9100";
const CLR_LEAF = "#b0bec5";
const CLR_LINE = "#37474f";
const CLR_LINE_HI = "#546e7a";
const CLR_HEADER = "#0e1822";
const CLR_TXT = "#b0bec5";

function nodeColor(ct, depth) {
  if (depth === 0) return CLR_ROOT;
  if (depth === 1 && ct >= 80) return CLR_FEEDER;
  if (depth === 1) return CLR_SUBSECTION;
  if (ct >= 30) return CLR_SECTION;
  if (ct >= 20) return CLR_SUBSECTION;
  return CLR_LEAF;
}

// ═══ NODE DIMENSIONS ═══
const NODE_W = 170;
const NODE_H = 56;
const H_GAP = 24;
const V_GAP = 70;

// ═══ METER DATA ═══
const METERS = [
  {"id":"13410","name":"Л-8/2 кафе","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"11903","name":"Администрация Борисович","ct":1.0,"parents":"12295, 10098, 13401, КРУН-2"},
  {"id":"13418","name":"Л-8/4 кухня туркмен","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"13408","name":"Л-8/9 (ПВ-27/3,4 )","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"13425","name":"Ж-8-Ж12 (ТП1913)","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"11901","name":"ПВК 1 Офис (снд)","ct":1.0,"parents":"12295, 10098, 13401, КРУН-2"},
  {"id":"13424","name":"Г-9/1, Д-10/1, Д-12/1","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"13423","name":"Е-8/1-Е-12/7","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"() Пло","name":"Площадка П2","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"11636","name":"З-13","ct":1.0,"parents":"12295, 10098, 13401, КРУН-2"},
  {"id":"11772","name":"Л-8/1 , 1 этаж  ( ПВ-27/8 Этаж 2 )","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"10239","name":"Ряд З-И Торец Магистраль.","ct":50.0,"parents":"10096, 13401, КРУН-2"},
  {"id":"11616","name":"Л-8/8 ( ПВ-27/3 )","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"10222","name":"Г-9/1, Д-10/1, Д-12/1","ct":50.0,"parents":"13424, 13401, КРУН-2"},
  {"id":"10224","name":"Д-9/1, Г-11/1, Г-12/8","ct":50.0,"parents":"12732, 13401, КРУН-2"},
  {"id":"11923","name":"ПВ-27/1 Сухие Смеси","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"6926","name":"Администрация (rs)","ct":60.0,"parents":"12736, 10098, 13401, КРУН-2"},
  {"id":"12089","name":"Наномойка Л-9","ct":20.0,"parents":"13401, КРУН-2"},
  {"id":"11769","name":"ПВ-27/7 ; Л-8/5","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"11771","name":"ПВ-27 Сервер интернет  ПРОВАЙДЕР","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"11770","name":"ПВ-27/6 (Л-8/6)","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"11937","name":"Кафе \"Хамза\" щитовая Администрация","ct":1.0,"parents":"12295, 10098, 13401, КРУН-2"},
  {"id":"10099","name":"Л-8/1, Л-8-Л-8/1","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"12732","name":"Д-9/1, Г-11/1, Г-12/8","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"13621","name":"Освещение Л-8, Л-9","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"10868","name":"Г-11/5","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10853","name":"Г-10/1,2 (котел)","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10864Х","name":"Г-11/3 (снд)","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10863","name":"Г-11/4","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10832","name":"Г-13/3 Офис","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10835","name":"Г-13/1","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10837","name":"Г-12/3 ( Г-12/3 А )","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10834","name":"Г-13/4","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10839","name":"Г-12/5","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10836","name":"Г-12/1,2","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10829","name":"Г-13/6","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"7960","name":"Г-12/7,8","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10833","name":"Г-13/3","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10831","name":"Г-13/2","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10841","name":"Г-12/4","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"7929","name":"Общий Е-12","ct":50.0,"parents":"7933, 13423, 13401, КРУН-2"},
  {"id":"10021","name":"Е-12/4","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10022","name":"Е-12/5","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10018","name":"Е-12/1","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10024","name":"Е-12/7","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10023","name":"Е-12/6","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10025","name":"Обогрев е-12/1 (хоз)","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10020","name":"Е-12/3","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10019","name":"Е-12/2","ct":1.0,"parents":"7929, 7933, 13423, 13401, КРУН-2"},
  {"id":"10888","name":"Д-12/3","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10893","name":"Д-12/4","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10895","name":"Д-13/3","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10253","name":"Д-12/6","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10891","name":"Д-13/1","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10892","name":"Д-12/7","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10894","name":"Д-13/2","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10896","name":"Д-13/4","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10897","name":"Д-13/5","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"7971","name":"Д-12/1","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10889","name":"Д-12/5","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10890","name":"Д-12/8","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10887","name":"Д-10/8","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10848","name":"Д-11/8","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10847","name":"Д-11/1","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10882","name":"Д-11/3","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10849","name":"Д-11/6","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"7931","name":"Общий Е-9/1","ct":40.0,"parents":"7933, 13423, 13401, КРУН-2"},
  {"id":"7992","name":"Е-9/6","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"8000","name":"Е-8 Туалет","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"10094","name":"Е-8/2","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7999","name":"Е-8/6","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"8001","name":"Е-8/7","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7988","name":"Е-9/1","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7996","name":"Е-8/3","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7991","name":"Е-9/5","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7997","name":"Е-8/4 (снд)","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7987","name":"Е-9/3","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7989","name":"Е-9/2","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7998","name":"Е-8/5","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7993","name":"Е-9/7","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7990","name":"Е-9/4","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"7994","name":"Е-8/1","ct":1.0,"parents":"7931, 7933, 13423, 13401, КРУН-2"},
  {"id":"10244","name":"Общий Д-8/8, Д-8/1-9/8 (+)","ct":40.0,"parents":"10224, 12732, 13401, КРУН-2"},
  {"id":"10640","name":"Д-8/3","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10639","name":"Д-8/1","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10635","name":"Д-8/8","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10643","name":"Д-9/1","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10874","name":"Д-9/7","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10395","name":"Д-8/4","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10634","name":"Д-8/6","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"7974","name":"Д-8/7","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10748","name":"Д-9/4","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"7973","name":"Д-8/5","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10641","name":"Д-9/8","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10637","name":"Д-9/2","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10642","name":"Д-9/5","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"7972","name":"Д-8/2","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10801","name":"Д-9/6","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"10638","name":"Д-9/3","ct":1.0,"parents":"10244, 10224, 12732, 13401, КРУН-2"},
  {"id":"7928","name":"Общий Е-11/1","ct":50.0,"parents":"7933, 13423, 13401, КРУН-2"},
  {"id":"10011","name":"Е-11/2","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10015","name":"Е-11/8","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10016","name":"Е-11/5,6","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10009","name":"Е-10/7,8","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10007","name":"Е-10/5","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10026","name":"Е-10/7 Конект сервер ПРОВАЙДЕР","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10014","name":"Е-11/7","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10006","name":"Е-10/3,4","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10005","name":"Е-10/1,2","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10012","name":"Е-11/3","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10017","name":"Интернет Westkall Е-11/1 ПРОВАЙДЕР","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10010","name":"Е-11/1 5квт2","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10008","name":"Е-10/6","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"11048","name":"З-8/3","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"11045","name":"З-8/7","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"11043","name":"З-8/5","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"11044","name":"З-8/6","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"10966","name":"З-11/2","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10972","name":"З-11/5","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10963","name":"З-ряд 12/1 Освещение улице","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"11124","name":"З-11/7","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10971","name":"З-12/1","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10964","name":"З-11/1","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10976","name":"З-11/3","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10974","name":"З-11/6","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"7958","name":"З-12/2","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10975","name":"З-12/4","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"7985","name":"Стройка Андрей, отчет для ВА","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10970","name":"З-12/3","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10225","name":"Общий З-10/1 З-9/1-10/4","ct":40.0,"parents":"10239, 10096, 13401, КРУН-2"},
  {"id":"10960","name":"З-9/3","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10968","name":"З-10/1","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"11298","name":"З-9/6","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10958","name":"З-10/4","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"6975","name":"З-10/2 Кафе 2-й этаж","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10961","name":"З-9/1,2","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10955","name":"З-10/2","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10965","name":"З-9/4","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10957","name":"З-10/4А","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10954","name":"З-10/3","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10969","name":"З-9/7","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10959","name":"З-10/3","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10967","name":"З-10/1","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10956","name":"З-9/8","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"11299","name":"З-9/5","ct":1.0,"parents":"10225, 10239, 10096, 13401, КРУН-2"},
  {"id":"10221","name":"Общий И-12/1 И-12/1-12/5","ct":40.0,"parents":"10239, 10096, 13401, КРУН-2"},
  {"id":"11905","name":"И-12/2","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"10876","name":"И-11/8","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"11073","name":"И-12/1","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"11028","name":"И-12/3","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"11072","name":"И-11/7","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"11052","name":"И-11/2","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"11053","name":"И-12/4","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"11071","name":"И-11/1","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"11125","name":"И-11/3,4,5,6","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"13074","name":"П-5/1 ( Л-8/9 )","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"12943","name":"П-4/8","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"10878","name":"И-12/5","ct":1.0,"parents":"10221, 10239, 10096, 13401, КРУН-2"},
  {"id":"7935","name":"Секция Ж-9/1","ct":50.0,"parents":"7934, 13425, 13401, КРУН-2"},
  {"id":"10038","name":"Ж-9/4","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10040","name":"Ж-9/6","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10036","name":"Ж-9/2","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10028","name":"Ж-8/1","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10063","name":"Ж-9/1","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10034","name":"Ж-8/7","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10035","name":"Ж-9/1,2","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10032","name":"Ж-8/5","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"11803","name":"Ж-8/4","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10037","name":"Ж-9/3","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10033","name":"Ж-8/6","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10029","name":"Ж-8/2","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10041","name":"Ж-9/7","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10030","name":"Ж-8/3","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"10046","name":"Ж-10/5","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10047","name":"Ж-10/6","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10049","name":"Ж-11/3","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10043","name":"Ж-10/1","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10053","name":"Ж-11/7","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10048","name":"Ж-10/7,8","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"7902","name":"Ж-11/2(снд)","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10055","name":"Ж-11/1 интернет Конект  ПРОВАЙДЕР","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10054","name":"Ж-11/8","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10051","name":"Ж-11/5","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10044","name":"Ж-10/2","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"7930","name":"Секция Ж-12","ct":50.0,"parents":"7934, 13425, 13401, КРУН-2"},
  {"id":"10061","name":"Ж-12/6","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"10060","name":"Ж-12/7","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"10056","name":"Ж-12/1","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"11186","name":"П-6/10,11","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"11508","name":"Ж-12/1 Обогрев","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"10058","name":"Ж-12/3","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"10059","name":"Ж-12/4 5квт","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"7957","name":"Ж-12/5","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"10057","name":"Ж-12/2","ct":1.0,"parents":"7930, 7934, 13425, 13401, КРУН-2"},
  {"id":"10223","name":"Общий И-8/8 И-8/1-И8/8","ct":30.0,"parents":"10239, 10096, 13401, КРУН-2"},
  {"id":"13391","name":"И-8/1 шаурма","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"10300","name":"П-4/2,3,4 Металл ДК","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"10299","name":"И-8/7","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"11640","name":"И-8/3","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"7934","name":"Ряд Ж8-Ж12","ct":40.0,"parents":"13425, 13401, КРУН-2"},
  {"id":"10298","name":"И-8/5","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"10295","name":"И-8/1","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"13559","name":"П-4/2","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"10297","name":"И-8/2","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"13086","name":"И-8/8","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"10228","name":"Общий И-9/8 И-9/1-10/4","ct":40.0,"parents":"10239, 10096, 13401, КРУН-2"},
  {"id":"11066","name":"И-10/3","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"11062","name":"И-9/3,4","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"10304","name":"И-9/1,2 5квт","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"11070","name":"И-9/5,6","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"11065","name":"И-10/3 ( И-10/3А)","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"11067","name":"П-4/7","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"10302","name":"И-10/2","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"10306","name":"И-9/8","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"11064","name":"И-10/4","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"10307","name":"П-4/5 (Л-7/8)","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"4926","name":"Л-8/3  ст.(ПВ-27/8)","ct":1.0,"parents":"10099, 13401, КРУН-2"},
  {"id":"12293","name":"На щит з-14/1","ct":20.0,"parents":"10098, 13401, КРУН-2"},
  {"id":"11023","name":"З-14/5","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"11460","name":"З-14/3","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"10101","name":"АТС ввод номер 2 Пассаж 55 Весткол","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"11458","name":"З-14/10","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"11457","name":"З-14/4","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"11020","name":"З-14/2 Офис","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"11024","name":"З-14/1","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"11459","name":"З-14/1 Освещение улица","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"11022","name":"З-14/6,7,8,9","ct":1.0,"parents":"12293, 10098, 13401, КРУН-2"},
  {"id":"7933","name":"Ряды Е8-Е12","ct":40.0,"parents":"13423, 13401, КРУН-2"},
  {"id":"10096","name":"З-И-8-12","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"10236","name":"Общий Г-9/1; Г-8/1-Г-9/7,8 (+)","ct":30.0,"parents":"10222, 13424, 13401, КРУН-2"},
  {"id":"10828","name":"Г-8/4","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10824","name":"Г-8/8","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10822","name":"Г-9/2","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10818","name":"Туалет Г-Д/8","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10237","name":"Общий Г-11/1, Г-10/1-11/6 (+)","ct":40.0,"parents":"10224, 12732, 13401, КРУН-2"},
  {"id":"11127","name":"Г-10/7,8","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10859","name":"Г-11/7","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10862","name":"Г-10/1,2 2 этаж","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10865","name":"Г-10/4","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10869","name":"Г-10/3","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10858","name":"Г-10/6","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10860","name":"Г-11/1,2","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10861","name":"Г-10/5","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10867","name":"Г-11/6","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10866","name":"Г-11/8","ct":1.0,"parents":"10237, 10224, 12732, 13401, КРУН-2"},
  {"id":"10227","name":"Общий Г-12/8, Г-12/1-13/6 (+)","ct":40.0,"parents":"10224, 12732, 13401, КРУН-2"},
  {"id":"10840","name":"Г-12/6","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10830","name":"Г-13/5","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10838","name":"Г-12/3","ct":1.0,"parents":"10227, 10224, 12732, 13401, КРУН-2"},
  {"id":"10240","name":"Общий Д-12/7, Д-12/1-13А/1 (+)","ct":50.0,"parents":"10222, 13424, 13401, КРУН-2"},
  {"id":"13326","name":"Д-13А/1 (Д-13/7)","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"7970","name":"Д-12/2 (снд)","ct":1.0,"parents":"10240, 10222, 13424, 13401, КРУН-2"},
  {"id":"10242","name":"Общий Д-10/8, Д-10/1-11/8 (+)","ct":30.0,"parents":"10222, 13424, 13401, КРУН-2"},
  {"id":"10851","name":"Д-10/4","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10884","name":"Д-10/5","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10854","name":"Д-11/2","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10435","name":"Д-11/5","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10883","name":"Д-10/3","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10886","name":"Д-10/7","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10885","name":"Д-10/6","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10852","name":"Д-10/1","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10857","name":"Д-11/4 5квт","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10850","name":"Д-10/2","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"10856","name":"Д-11/7","ct":1.0,"parents":"10242, 10222, 13424, 13401, КРУН-2"},
  {"id":"7959","name":"Г-9/6","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10013","name":"Е-11/4","ct":1.0,"parents":"7928, 7933, 13423, 13401, КРУН-2"},
  {"id":"10226","name":"Общий З-8/8 З-8/1-8/8","ct":40.0,"parents":"10239, 10096, 13401, КРУН-2"},
  {"id":"11047","name":"З-8/4","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"10110","name":"З-8/2","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"11042","name":"З-8/1","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"11046","name":"З-8/8","ct":1.0,"parents":"10226, 10239, 10096, 13401, КРУН-2"},
  {"id":"10098","name":"Администрация Л-10","ct":80.0,"parents":"13401, КРУН-2"},
  {"id":"12985","name":"Л-10 Машдвор","ct":50.0,"parents":"10098, 13401, КРУН-2"},
  {"id":"12295","name":"Л-10 4 из 5 автомат с верху контрольный","ct":20.0,"parents":"10098, 13401, КРУН-2"},
  {"id":"12736","name":"Л-10 центральная администрация","ct":50.0,"parents":"10098, 13401, КРУН-2"},
  {"id":"13011","name":"Л-10 Мастер микс","ct":80.0,"parents":"10098, 13401, КРУН-2"},
  {"id":"10238","name":"Общий З-12/1 З-11/1-12/5","ct":40.0,"parents":"10239, 10096, 13401, КРУН-2"},
  {"id":"11123","name":"З-12/5","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10962","name":"П-6/1","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10977","name":"З-11/4","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"11667","name":"З-11/8 (котел)","ct":1.0,"parents":"10238, 10239, 10096, 13401, КРУН-2"},
  {"id":"10039","name":"Ж-9/5","ct":1.0,"parents":"7935, 7934, 13425, 13401, КРУН-2"},
  {"id":"7932","name":"Секция Ж-11","ct":50.0,"parents":"7934, 13425, 13401, КРУН-2"},
  {"id":"10050","name":"Ж-11/4","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10045","name":"Ж-10/3,4","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"7975","name":"Ж-11/1","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"10052","name":"Ж-11/6","ct":1.0,"parents":"7932, 7934, 13425, 13401, КРУН-2"},
  {"id":"7955","name":"И-8/4 (КБ) (снд)","ct":1.0,"parents":"10223, 10239, 10096, 13401, КРУН-2"},
  {"id":"11063","name":"И-10/4 ( И-10/4А)","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"11068","name":"И-9/7","ct":1.0,"parents":"10228, 10239, 10096, 13401, КРУН-2"},
  {"id":"10826","name":"Г-8/2","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"13048","name":"Г-9/8","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10817","name":"Г-9/7","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10815","name":"Г-9/4","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10821","name":"Г-9/1 5квт","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10816","name":"Г-9/5","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10825","name":"Г-8/5","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10819","name":"Г-8/6","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10827","name":"Г-8/3","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10820","name":"Г-8/7","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10814","name":"Г-8/1","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"},
  {"id":"10823","name":"Г-9/3","ct":1.0,"parents":"10236, 10222, 13424, 13401, КРУН-2"}
];

// ═══ BUILD TREE ═══
function buildTree(meters) {
  const ROOT_ID = "13401";
  const childrenMap = {}; // parentId -> [meter, ...]
  const meterMap = {};    // id -> meter

  // Index all meters
  for (const m of meters) {
    meterMap[m.id] = m;
  }

  // Build children map from parent chains
  for (const m of meters) {
    const parts = m.parents.split(",").map(s => s.trim());
    const directParent = parts[0];
    if (!childrenMap[directParent]) childrenMap[directParent] = [];
    childrenMap[directParent].push(m);
  }

  // Recursive tree builder
  function makeNode(id, name, ct, depth) {
    const kids = childrenMap[id] || [];
    const children = kids.map(k => makeNode(k.id, k.name, k.ct, depth + 1));
    return { id, name, ct, depth, children };
  }

  return makeNode(ROOT_ID, "\u0422\u041F-1913", 0, 0);
}

// ═══ LAYOUT ALGORITHM ═══
// Computes {id, x, y, width, height, depth} for each visible node
// Uses a recursive bottom-up approach: measure subtree width, then position
function computeLayout(root, collapsed) {
  const positions = []; // flat list of {id, name, ct, x, y, depth, hasChildren, isCollapsed}
  const edges = [];     // {fromId, toId, x1, y1, x2, y2}

  // First pass: compute subtree widths
  function subtreeWidth(node) {
    const isGroup = node.children.length > 0;
    const isColl = collapsed.has(node.id);
    if (!isGroup || isColl) return NODE_W;
    let w = 0;
    for (let i = 0; i < node.children.length; i++) {
      if (i > 0) w += H_GAP;
      w += subtreeWidth(node.children[i]);
    }
    return Math.max(NODE_W, w);
  }

  // Second pass: assign positions
  function layout(node, left, top) {
    const isGroup = node.children.length > 0;
    const isColl = collapsed.has(node.id);
    const sw = subtreeWidth(node);
    const cx = left + sw / 2;
    const cy = top;

    positions.push({
      id: node.id,
      name: node.name,
      ct: node.ct,
      x: cx - NODE_W / 2,
      y: cy,
      depth: node.depth,
      hasChildren: isGroup,
      isCollapsed: isColl,
      childCount: node.children.length,
    });

    if (isGroup && !isColl) {
      let childLeft = left;
      const childTop = top + NODE_H + V_GAP;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const cw = subtreeWidth(child);
        const childCx = childLeft + cw / 2;

        edges.push({
          fromId: node.id,
          toId: child.id,
          x1: cx,
          y1: cy + NODE_H,
          x2: childCx,
          y2: childTop,
        });

        layout(child, childLeft, childTop);
        childLeft += cw + H_GAP;
      }
    }
  }

  layout(root, 0, 0);

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + NODE_W > maxX) maxX = p.x + NODE_W;
    if (p.y + NODE_H > maxY) maxY = p.y + NODE_H;
  }

  const PAD = 60;
  const w = maxX - minX + PAD * 2;
  const h = maxY - minY + PAD * 2;

  // Shift all positions so minX/minY start at PAD
  const dx = -minX + PAD;
  const dy = -minY + PAD;
  for (const p of positions) { p.x += dx; p.y += dy; }
  for (const e of edges) { e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy; }

  return { positions, edges, width: w, height: h };
}

// ═══ TRUNCATE TEXT ═══
function truncate(s, max) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}

// ═══ COMPONENT ═══
export default function MeterTree({ onBack }) {
  const containerRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 0.45 });
  const [pan, setPan] = useState(null);

  // Build tree once
  const tree = useMemo(() => buildTree(METERS), []);

  // Initially collapse everything except root and its direct children (depth >= 2)
  const [collapsed, setCollapsed] = useState(() => {
    const set = new Set();
    function walk(node) {
      if (node.depth >= 2 && node.children.length > 0) {
        set.add(node.id);
      }
      for (const c of node.children) walk(c);
    }
    walk(tree);
    return set;
  });

  // Compute layout
  const layout = useMemo(() => computeLayout(tree, collapsed), [tree, collapsed]);

  // Toggle collapse
  const toggle = useCallback((id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Fit all
  const fitAll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const headerH = 48;
    const availW = rect.width;
    const availH = rect.height - headerH;
    if (availW <= 0 || availH <= 0) return;
    const zx = availW / layout.width;
    const zy = availH / layout.height;
    const z = Math.min(zx, zy, 1.5) * 0.92;
    const cx = (availW - layout.width * z) / 2;
    const cy = (availH - layout.height * z) / 2 + headerH;
    setView({ x: cx, y: cy, zoom: z });
  }, [layout]);

  // Fit on first render
  useEffect(() => { fitAll(); }, []);

  // Zoom with wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setView(v => {
        const nz = Math.max(0.05, Math.min(3, v.zoom + delta * v.zoom));
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const scale = nz / v.zoom;
        return { x: mx - scale * (mx - v.x), y: my - scale * (my - v.y), zoom: nz };
      });
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  // Pan handlers
  const onPanStart = useCallback((e) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setPan({ sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y });
    }
  }, [view]);

  const onPanMove = useCallback((e) => {
    if (!pan) return;
    setView({ x: pan.ox + (e.clientX - pan.sx), y: pan.oy + (e.clientY - pan.sy), zoom: view.zoom });
  }, [pan, view.zoom]);

  const onPanEnd = useCallback(() => { setPan(null); }, []);

  useEffect(() => {
    if (!pan) return;
    const move = (e) => {
      setView(v => ({
        x: pan.ox + (e.clientX - pan.sx),
        y: pan.oy + (e.clientY - pan.sy),
        zoom: v.zoom,
      }));
    };
    const up = () => setPan(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [pan]);

  // Block context menu
  const onCtx = useCallback((e) => e.preventDefault(), []);

  // ═══ RENDER ═══
  const { positions, edges, width: cW, height: cH } = layout;

  return (
    <div
      ref={containerRef}
      onContextMenu={onCtx}
      style={{
        position: "fixed", inset: 0,
        background: CLR_BG,
        fontFamily: FN,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 48,
        background: CLR_HEADER,
        display: "flex", alignItems: "center", gap: 16,
        padding: "0 16px",
        zIndex: 10,
        borderBottom: "1px solid #1a2a3a",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "1px solid #37474f", borderRadius: 4,
            color: CLR_TXT, fontFamily: FN, fontSize: 13, padding: "4px 12px",
            cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#00e5ff"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#37474f"}
        >
          {"\u2190 \u041D\u0430\u0437\u0430\u0434"}
        </button>
        <span style={{ color: CLR_ROOT, fontSize: 15, fontWeight: 700 }}>
          {"\u0422\u041F-1913"}
        </span>
        <span style={{ color: CLR_TXT, fontSize: 13 }}>
          {"\u0414\u0435\u0440\u0435\u0432\u043E \u0443\u0447\u0451\u0442\u0430 0.4 \u043A\u0412"}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#546e7a", fontSize: 11 }}>
          {positions.length} {"\u0441\u0447\u0451\u0442\u0447\u0438\u043A\u043E\u0432"}
        </span>
        <button
          onClick={fitAll}
          style={{
            background: "none", border: "1px solid #37474f", borderRadius: 4,
            color: CLR_TXT, fontFamily: FN, fontSize: 12, padding: "4px 10px",
            cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#76ff03"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#37474f"}
        >
          Fit All
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0 }}
        onMouseDown={onPanStart}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.zoom})`}>
          {/* Edges */}
          {edges.map((e, i) => {
            const midY = e.y1 + (e.y2 - e.y1) * 0.45;
            return (
              <path
                key={i}
                d={`M${e.x1},${e.y1} V${midY} H${e.x2} V${e.y2}`}
                fill="none"
                stroke={CLR_LINE}
                strokeWidth={1.5}
              />
            );
          })}

          {/* Nodes */}
          {positions.map((p) => {
            const clr = nodeColor(p.ct, p.depth);
            const isGroup = p.hasChildren;
            const isColl = p.isCollapsed;
            return (
              <g key={p.id} transform={`translate(${p.x},${p.y})`}>
                {/* Card background */}
                <rect
                  x={0} y={0}
                  width={NODE_W} height={NODE_H}
                  rx={6} ry={6}
                  fill={CLR_BG}
                  stroke={clr}
                  strokeWidth={1.5}
                  opacity={0.95}
                />
                {/* Left accent bar */}
                <rect
                  x={0} y={0}
                  width={4} height={NODE_H}
                  rx={2} ry={2}
                  fill={clr}
                />

                {/* Meter ID */}
                <text
                  x={10} y={17}
                  fill={clr}
                  fontSize={11}
                  fontWeight={700}
                  fontFamily={FN}
                >
                  {truncate(p.id, 18)}
                </text>

                {/* CT badge */}
                {p.ct > 0 && (
                  <>
                    <rect
                      x={NODE_W - 38} y={4}
                      width={32} height={14}
                      rx={3} ry={3}
                      fill={clr}
                      opacity={0.15}
                    />
                    <text
                      x={NODE_W - 22} y={14}
                      fill={clr}
                      fontSize={9}
                      fontFamily={FN}
                      textAnchor="middle"
                    >
                      {p.ct === 1 ? "1:1" : `${p.ct}`}
                    </text>
                  </>
                )}

                {/* Consumer name */}
                <text
                  x={10} y={32}
                  fill={CLR_TXT}
                  fontSize={8.5}
                  fontFamily={FN}
                  opacity={0.8}
                >
                  {truncate(p.name, 22)}
                </text>

                {/* Child count */}
                {isGroup && (
                  <text
                    x={10} y={47}
                    fill="#546e7a"
                    fontSize={8}
                    fontFamily={FN}
                  >
                    {isColl ? `+${p.childCount} ...` : `${p.childCount} \u0434\u043E\u0447.`}
                  </text>
                )}

                {/* Collapse/expand toggle */}
                {isGroup && p.depth > 0 && (
                  <g
                    onClick={(ev) => { ev.stopPropagation(); toggle(p.id); }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={NODE_W - 20} y={NODE_H - 18}
                      width={16} height={14}
                      rx={3} ry={3}
                      fill={isColl ? "#1a3a2a" : "#1a2a3a"}
                      stroke={isColl ? "#76ff03" : "#37474f"}
                      strokeWidth={1}
                    />
                    <text
                      x={NODE_W - 12} y={NODE_H - 7}
                      fill={isColl ? "#76ff03" : CLR_TXT}
                      fontSize={10}
                      fontFamily={FN}
                      textAnchor="middle"
                      fontWeight={700}
                    >
                      {isColl ? "+" : "\u2212"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 12, left: 12,
        background: "rgba(10,25,41,0.9)",
        border: "1px solid #1a2a3a",
        borderRadius: 6, padding: "8px 12px",
        display: "flex", gap: 14, alignItems: "center",
        zIndex: 10,
      }}>
        {[
          [CLR_ROOT, "\u041A\u043E\u0440\u0435\u043D\u044C"],
          [CLR_FEEDER, "\u0424\u0438\u0434\u0435\u0440 \u226580"],
          [CLR_SECTION, "\u0421\u0435\u043A\u0446\u0438\u044F 30-79"],
          [CLR_SUBSECTION, "\u041F\u043E\u0434\u0441\u0435\u043A\u0446\u0438\u044F 20-29"],
          [CLR_LEAF, "\u041F\u043E\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043B\u044C"],
        ].map(([c, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              display: "inline-block", width: 10, height: 10,
              borderRadius: 2, background: c,
            }} />
            <span style={{ color: CLR_TXT, fontSize: 10, fontFamily: FN }}>{label}</span>
          </span>
        ))}
      </div>

      {/* Zoom indicator */}
      <div style={{
        position: "absolute", bottom: 12, right: 12,
        color: "#546e7a", fontSize: 10, fontFamily: FN,
        zIndex: 10,
      }}>
        {Math.round(view.zoom * 100)}%
      </div>
    </div>
  );
}
