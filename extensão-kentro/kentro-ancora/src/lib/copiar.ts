/**
 * Copia um texto. O quadro da Kentro não libera navigator.clipboard (o iframe não tem
 * allow="clipboard-write"), então o caminho alternativo é o que funciona dentro dela.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    /* segue para o caminho alternativo */
  }
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.position = 'fixed';
  campo.style.opacity = '0';
  // Em tela cheia, só o que está dentro do elemento em tela cheia recebe foco.
  (document.fullscreenElement ?? document.body).append(campo);
  campo.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    campo.remove();
  }
}
