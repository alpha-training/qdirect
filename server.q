if[not system"p";system"p 8000"];

.z.ws:{
  r:get(a:.j.k x)`cmd;
  if[`text=fmt:`$a`format;if[10<>type r;r:.Q.s r]];
  neg[.z.w] -8!select format:fmt,result:r from a
  }

SYM:`JPM`GE
N:10
trade:([]sym:N?SYM;size:100*1+N?10)

\e 1