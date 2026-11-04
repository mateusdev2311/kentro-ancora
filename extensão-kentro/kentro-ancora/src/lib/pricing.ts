export type PlanName = "Kentro Start" | "Social Pro" | "Excelência Pro" | "Kentro C-Level";

const T: Record<string, number[]> = {
  startA: [437.36,569.36,701.36,833.36,903.76,974.16,1044.56,1106.16,1167.76],
  startM: [497,647,797,947,1027,1107,1187,1257,1327],
  sisA:   [349.36,481.36,613.36,745.36,789.36,877.36,921.36,965.36,1018.16],
  sisM:   [397,547,697,847,897,997,1047,1097,1157],
  iStart: [566.17,616.17,966.17,1016.17,1042.83,1269.5,1296.17,1319.5,1342.83],
  iSocial:[1066.17,1116.17,1866.17,1916.17,1942.83,2369.5,2396.17,2419.5,2442.83],
  iExcel: [832.83,882.83,1632.83,1682.83,1699.5,2232.83,2249.5,2266.17,2286.17],
};
const PKG: Record<string, number> = { startA:1273.36, startM:1447, sisA:1229.36, sisM:1397, iStart:1382.83, iSocial:2482.83, iExcel:2366.17 };
const CONS = 1200; // consultoria mensal da Excelência Pro
const fmt = (v:number)=> "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});

export function computePlans(users:number, mentoria=false){
  const u = Math.max(2, users);
  const tier=(k:string)=>T[k]?.[u-2]??0;
  const pkg=(k:string)=>PKG[k]??0;
  const seg=(k:string,rate:number)=> u<=10?tier(k): u<=20?pkg(k): pkg(k)+rate*(u-20);
  const startA=seg("startA",60), startM=seg("startM",70), sisA=seg("sisA",60), sisM=seg("sisM",70);
  const xIdx = u<=20?0:Math.ceil((u-20)/10);
  const impl=(k:string,step:number)=> (u<=10?tier(k):pkg(k)) + step*xIdx;
  const eco=(m:number,a:number)=> "Economia de "+fmt((m-a)*12)+"/ano no anual";
  return {
    usersLabel: u + (u===1?" usuário":" usuários"),
    start:  { anual:fmt(startA), mensal:fmt(startM), eco:eco(startM,startA), implantacao:fmt(impl("iStart",40)) },
    social: { anual:fmt(startA), mensal:fmt(startM), eco:eco(startM,startA), implantacao:fmt(impl("iSocial",40)) },
    excel:  { anual:fmt(sisA+CONS), sistema:fmt(sisA), mensal:fmt(sisM+CONS), eco:eco(sisM+CONS,sisA+CONS), implantacao:fmt(impl("iExcel",80)) },
    clevel: { anual:fmt(sisA), mensal:fmt(sisM), mentoria:fmt(sisA*0.85), mentoriaAvista:"R$ 5.000,00 à vista ou 12× R$ 500,00" },
    raw: { startA, startM, sisA, sisM }, // números crus para a ancoragem usar a mensalidade do plano escolhido
  };
}
