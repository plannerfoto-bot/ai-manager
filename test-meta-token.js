import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const token = "EAANSfEdZC0TYBRId2sWf27KDIqUxiDkyTZBu8d5Xl7rnVlLksSvZCbYqmSDavtmbitw7XJnWZCVW8ZAfPdhpT3puIihqu5c6aYt99tRXAoyJytlZB5VkcwQ03zDR3105vJH9y7tTk8wj1nSZCnmMar0JUvxvuMO3I4spa9zQyNcxRe3ONHwqYUnBwxM3F9leKRtqgZDZD";
const pageId = "1239980869347062";

async function diagnose() {
    console.log("--- Diagnóstico Meta API ---");
    
    try {
        console.log("1. Testando validade do token (me)...");
        const me = await axios.get(`https://graph.facebook.com/v18.0/me?access_token=${token}`);
        console.log("✅ Token válido para o usuário:", me.data.name, "(ID:", me.data.id, ")");
        
        console.log("\n2. Listando páginas acessíveis por este token...");
        const accounts = await axios.get(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
        const pages = accounts.data.data || [];
        console.log(`Encontradas ${pages.length} páginas.`);
        
        if (pages.length === 0) {
            console.log("❌ ATENÇÃO: Este token não tem acesso a nenhuma Página do Facebook.");
            console.log("   Dica: No Graph API Explorer, certifique-se de selecionar a PÁGINA no menu suspenso 'User or Page'");
            console.log("   e de adicionar as permissões 'pages_read_engagement' e 'pages_show_list'.");
        }

        const targetPage = pages.find(p => p.id === pageId);
        if (targetPage) {
            console.log("✅ A página alvo FOI encontrada na lista de contas do token!");
            console.log("   Nome da Página:", targetPage.name);
            console.log("   Permissões na página:", (targetPage.perms || []).join(', '));
            
            console.log("\n3. Verificando conta Instagram vinculada...");
            const igRes = await axios.get(`https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account,name&access_token=${token}`);
            console.log("   Resposta completa:", JSON.stringify(igRes.data));
            if (igRes.data.instagram_business_account) {
                console.log("✅ Conta Instagram ID:", igRes.data.instagram_business_account.id);
            } else {
                console.log("❌ Nenhuma conta Instagram Business vinculada a esta página.");
            }
        } else if (pages.length > 0) {
            console.log(`❌ A página alvo (${pageId}) NÃO foi encontrada entre as ${pages.length} páginas acessíveis.`);
            console.log("   Páginas disponíveis para este token:", pages.map(p => `${p.name} (${p.id})`).join(' | '));
        }

    } catch (error) {
        console.error("❌ Erro no diagnóstico:");
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

diagnose();
