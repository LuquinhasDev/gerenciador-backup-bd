const testConnectionButton =
    document.getElementById("testConnection");

const connectionStatus =
    document.getElementById("connectionStatus");

const startBackupButton =
    document.getElementById("startBackup");

startBackupButton.addEventListener("click", () => {

    alert(
        "O processo de backup será implementado na Aula 3."
    );

});

testConnectionButton.addEventListener("click", async () => {

    connectionStatus.textContent = "Testando conexão...";
    connectionStatus.className = "";


    try {

        const response = await fetch(
            "http://localhost:3000/api/veiculos"
        );


        if (!response.ok) {
            throw new Error("Erro na comunicação com o backend.");
        }


        const vehicles = await response.json();


        connectionStatus.textContent =
            `✓ Conexão realizada com sucesso. ${vehicles.length} veículos encontrados.`;

        connectionStatus.className = "success";


    } catch (error) {

        console.error(error);

        connectionStatus.textContent =
            "✗ Não foi possível conectar ao banco.";

        connectionStatus.className = "error";

    }

});