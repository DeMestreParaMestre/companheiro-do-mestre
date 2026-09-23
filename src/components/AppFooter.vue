<script setup lang="ts">
const CONTACT = 'guilhermemmarquess@gmail.com'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="appFooter">
    <nav class="footLinks">
      <a href="termos.html">Termos de Uso</a>
      <span aria-hidden="true">·</span>
      <a href="privacidade.html">Política de Privacidade</a>
      <span aria-hidden="true">·</span>
      <a :href="'mailto:' + CONTACT">Contato</a>
    </nav>

    <details class="footLegal">
      <summary>Créditos e licenças</summary>
      <!-- Texto de atribuição exigido pela licença CC-BY-4.0 dos SRDs. -->
      <p>
        Este trabalho inclui material do System Reference Document 5.1 ("SRD 5.1") e do System Reference Document 5.2 ("SRD 5.2"), da
        Wizards of the Coast LLC, disponíveis em
        <a href="https://dnd.wizards.com/resources/systems-reference-document" target="_blank" rel="noopener">dnd.wizards.com/resources/systems-reference-document</a>. Os
        SRDs são licenciados sob a
        <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International License</a>.
      </p>
      <p>
        Monstros, magias e itens são obtidos pela API do <a href="https://open5e.com" target="_blank" rel="noopener">Open5e</a>. Conteúdos de outras
        fontes abertas (como A5E) seguem as licenças indicadas por cada publicação.
      </p>
      <p>Companheiro do Mestre é um projeto independente, sem afiliação ou endosso da Wizards of the Coast.</p>
    </details>

    <p class="footCopy">© {{ year }} De Mestre Para Mestre</p>
  </footer>
</template>

<style scoped>
.appFooter {
  max-width: 760px;
  margin: 2rem auto 0;
  padding: 1.2rem 1rem 2rem;
  border-top: 1px solid var(--border);
  text-align: center;
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--muted);
}
.appFooter a {
  color: var(--muted);
}
.appFooter a:hover {
  color: var(--red);
}
.footLinks {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}
.footLegal {
  margin: 0.7rem auto 0;
  max-width: 620px;
}
.footLegal summary {
  cursor: pointer;
  display: inline-block;
}
.footLegal summary:hover {
  color: var(--red);
}
.footLegal p {
  margin-top: 0.5rem;
  line-height: 1.55;
  text-align: left;
}
.footCopy {
  margin-top: 0.7rem;
  opacity: 0.8;
}
</style>
