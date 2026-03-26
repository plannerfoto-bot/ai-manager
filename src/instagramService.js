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
     */
    async createFeedContainer(igAccountId, imageUrl, caption, accessToken) {
        try {
            const response = await axios.post(`${this.baseUrl}/${igAccountId}/media`, {
                image_url: imageUrl,
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
            const payload = {
                image_url: imageUrl,
                media_type: 'STORIES',
                access_token: accessToken
            };
            // Associa o link do produto ao Story (funciona em contas Business)
            if (productLink) {
                payload.link = productLink;
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
