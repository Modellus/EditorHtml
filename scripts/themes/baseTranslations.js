class BaseTranslations {
    constructor(language) {
        this.language = language ?? "en-US";
        this.languages = { "pt-PT": {}, "en-US": {} };
        this.languages["pt-PT"] =
            {
                "Open...": "Abrir...",
                "Save...": "Guardar...",
                "New": "Novo",
                "Settings...": "Definições...",
                "Settings Title": "Definições",
                "Independent Start": "Início",
                "Independent End": "Fim",
                "Referential Tooltip": "<b>Referencial</b><br /><br />Adicione este para criar uma simulação com objetos lá dentro. Clique aqui para adicionar um, depois selecione-o e clique num objeto ou vetor para adicioná-lo à simulação.",
                "Expression Name": "Expressão",
                "Body Name": "Partícula",
                "Vector Name": "Vetor",
                "Chart Name": "Gráfico",
                "Table Name": "Tabela",
                "Referential Name": "Simulação",
                "Image Name": "Imagem",
                "Character Name": "Personagem",
                "Background Name": "Cenário",
                "Text Name": "Texto",
                "Ruler Name": "Régua",
                "Protractor Name": "Transferidor"
            };
        this.languages["en-US"] =
            {
                "Open...": "Open...",
                "Save...": "Save...",
                "New": "New",
                "Settings...": "Settings...",
                "Settings Title": "Settings",
                "Independent Start": "Start",
                "Independent End": "End",
                "Referential Tooltip": "<div style=\"text-align: center\"><b>Referential</b></div><br /><br /><div style=\"text-align: left\">Add this to create a simulation space for objects inside it. Click here to add one, then select it and click on an object or vector to add it to the simulation.</div>",
                "Expression Name": "Expression",
                "Body Name": "Body",
                "Vector Name": "Vector",
                "Chart Name": "Chart",
                "Table Name": "Table",
                "Referential Name": "Referential",
                "Image Name": "Image",
                "Character Name": "Character",
                "Background Name": "Background",
                "Text Name": "Text",
                "Ruler Name": "Ruler",
                "Protractor Name": "Protractor"
            };
    }

    get(text) {
        return this.languages[this.language][text];
    }
}