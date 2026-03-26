import axios from 'axios';

/**
 * Serviço para lidar com a API do Instagram (Meta Graph API)
 */
class InstagramService {
    constructor() {
        this.baseUrl = 'https://graph.facebook.com/v18.0';
    }

    /**
     * Obtém o ID da conta do Instagram vinculada a uma Página do Facebook
     */
    async getInstagramAccountId(pageId, accessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/${pageId}`, {
                params: {
                    fields: 'instagram_business_account',
                    access_token: accessToken
                }
            });
            return response.data.instagram_business_account ? response.data.instagram_business_account.id : null;
        } catch (error) {
            console.error('❌ Erro ao buscar ID do Instagram:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    /**
     * Cria um container de mídia para o Feed (Imagem)
     * Garantimos proporção 1:1 via proxy para evitar erro 400 do Meta
     */
    async createFeedContainer(igAccountId, imageUrl, caption, accessToken) {
        try {
            // Usamos weserv.nl para garantir que a imagem seja quadrada (white background) sem distorcer
            const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=1080&h=1080&fit=contain&bg=white`;
            
            const response = await axios.post(`${this.baseUrl}/${igAccountId}/media`, {
                image_url: proxiedUrl,
                caption: caption,
                access_token: accessToken
            });
            return response.data.id;
        } catch (error) {
            console.error('❌ Erro ao criar container de Feed:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    /**
     * Cria um container de mídia para o Story (Imagem)
     * productLink: link do produto que será associado ao Story
     */
    async createStoryContainer(igAccountId, imageUrl, productLink, accessToken) {
        try {
            // Para Stories, forçamos 1080x1920 (9:16) com fundo preto para evitar distorção
            const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=1080&h=1920&fit=contain&bg=black`;

            const payload = {
                image_url: proxiedUrl,
                media_type: 'STORIES',
                access_token: accessToken
            };

            // Link Stickers (Nova implementação profissional)
            if (productLink) {
                payload.interactive_components = JSON.stringify([
                    {
                        type: 'link',
                        url: productLink,
                        x: 0.5,
                        y: 0.8
                    }
                ]);
            }

            const response = await axios.post(`${this.baseUrl}/${igAccountId}/media`, payload);
            return response.data.id;
        } catch (error) {
            console.error('❌ Erro ao criar container de Story:', error.response ? error.response.data : error.message);
            throw error;
        }
    }


    /**
     * Pública o container de mídia (Feed ou Story se for o caso de container pronto)
     */
    async publishMedia(igAccountId, creationId, accessToken) {
        try {
            const response = await axios.post(`${this.baseUrl}/${igAccountId}/media_publish`, {
                creation_id: creationId,
                access_token: accessToken
            });
            return response.data.id;
        } catch (error) {
            console.error('❌ Erro ao publicar mídia:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
}

export default new InstagramService();
