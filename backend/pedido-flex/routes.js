/**
 * DEFINIÇÃO DE ROTAS - PEDIDOFLEX
 * Define os endpoints seguros do Express e os vincula aos handlers no controller.
 */

import express from 'express';
import { supabase } from './supabaseClient.js';
import {
  searchOrder,
  getEligibility,
  simulateOrderEdit,
  applyOrderEdit,
  revertOrderEdit,
  getEditsList,
  getEditDetails,
  getDiagnostics
} from './controller.js';

const router = express.Router();

// Middleware de autenticação local (segurança isolada)
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Acesso negado. Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Acesso negado. Falha na autenticação.' });
  }
};

// Rotas da API PedidoFlex
router.get('/orders/search', requireAuth, searchOrder);
router.post('/orders/:orderId/eligibility', requireAuth, getEligibility);
router.post('/orders/:orderId/simulate', requireAuth, simulateOrderEdit);
router.post('/orders/:orderId/apply', requireAuth, applyOrderEdit);
router.post('/edits/:editId/revert', requireAuth, revertOrderEdit);
router.get('/edits', requireAuth, getEditsList);
router.get('/edits/:editId', requireAuth, getEditDetails);
router.get('/diagnostics', requireAuth, getDiagnostics);

export default router;
