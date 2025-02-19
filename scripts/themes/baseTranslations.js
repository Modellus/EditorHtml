class BaseTranslations {
    constructor() {
    }

    getReferentialShapeTooltip(language) {
        return {
            "pt-PT": 
                `<b>Referencial</b><br /><br />
                Adicione este para criar uma simulação com objetos lá dentro. Clique aqui para adicionar um, depois selecione-o e clique num objeto ou vetor para adicioná-lo à simulação.`,
            "en-US": 
                `<div style="text-align: center"><b>Referential</b></div><br /><br />
                <div style="text-align: left">Add this to create a simulation space for objects inside it. Click here to add one, then select it and click on an object or vector to add it to the simulation.</div>`
        }[language];
    }
}