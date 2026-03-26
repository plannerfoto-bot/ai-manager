import axios from 'axios';

/**
 * Serviço para lidar com a API do Instagram (Meta Graph API)
 */
class InstagramService {
    constructor() {
        this.baseUrl = 'https://graph.facebook.com/v18.0';
    }

    /**
     * Extrai mensagem de erro detalhada da resposta do Meta
     */
    _extractError(error) {
        const data = error?.response?.data?.error || error?.response?.data;
        if (data?.message) {
            return `[Meta ${data.code || 400}] ${data.message}${data.error_subcode ? ` (subcode: ${data.error_subcode})` : ''}`;
        }
        return error.message;
    }

    /**
     * Valida as credenciais antes de tentar postar
     * Retorna { valid: bool, igAccountId, pageName, error }
     */
    async validateCredentials(pageId, accessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/${pageId}`, {
                params: {
                    fields: 'instagram_business_account,name',
                    access_token: accessToken
                }
            });
            const igId = response.data?.instagram_business_account?.id;
            if (!igId) {
                return {
                    valid: false,
                    error: `A Página ${response.data?.name || pageId} não tem uma conta Instagram Business vinculada. Conecte o Instagram no Gerenciador de Negócios da Meta.`
                };
            }
            return { valid: true, igAccountId: igId, pageName: response.data?.name };
        } catch (error) {
            return { valid: false, error: this._extractError(error) };
        }
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
            return response.data.instagram_business_account
                ? response.data.instagram_business_account.id
                : null;
        } catch (error) {
            console.error('❌ Erro ao buscar ID do Instagram:', error.response ? JSON.stringify(error.response.data) : error.message);
            throw new Error(this._extractError(error));
        }
    }

    /**
     * Cria um container de mídia para o Feed (Imagem)
     * Garantimos proporção 1:1 via proxy para evitar erro 400 do Meta
     */
    async createFeedContainer(igAccountId, imageUrl, caption, accessToken) {
        try {
            const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=1080&h=1080&fit=contain&bg=white`;
            console.log('📸 Feed container URL:', proxiedUrl.substring(0, 80) + '...');

            const response = await axios.post(`${this.baseUrl}/${igAccountId}/media`, {
                image_url: proxiedUrl,
                caption: caption,
                access_token: accessToken
            });
            return response.data.id;
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('❌ Erro ao criar container de Feed:', detail);
            throw new Error(this._extractError(error));
        }
    }

    /**
     * Cria um container de mídia para o Story (Imagem)
     */
    async createStoryContainer(igAccountId, imageUrl, productLink, accessToken) {
        try {
            const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=1080&h=1920&fit=contain&bg=black`;

            const payload = {
                image_url: proxiedUrl,
                media_type: 'STORIES',
                access_token: accessToken
            };

            const response = await axios.post(`${this.baseUrl}/${igAccountId}/media`, payload);
            return response.data.id;
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('❌ Erro ao criar container de Story:', detail);
            throw new Error(this._extractError(error));
        }
    }

    /**
     * Publica o container de mídia (Feed ou Story)
     */
    async publishMedia(igAccountId, creationId, accessToken) {
        try {
            const response = await axios.post(`${this.baseUrl}/${igAccountId}/media_publish`, {
                creation_id: creationId,
                access_token: accessToken
            });
            return response.data.id;
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('❌ Erro ao publicar mídia:', detail);
            throw new Error(this._extractError(error));
        }
    }
}

export default new InstagramService();
