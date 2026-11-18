export function textoTabla(valor: unknown): string {
  const elemento=document.createElement('span');
  elemento.textContent=String(valor ?? '');
  return elemento.innerHTML;
}
