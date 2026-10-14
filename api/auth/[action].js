// Consolidate auth endpoints into one Vercel function for Hobby plan limits.
// Existing public URLs remain /api/auth/{student-login|admin-login|logout|me}.

const handlers = {
    'student-login': require('./_student-login'),
    'admin-login': require('./_admin-login'),
    logout: require('./_logout'),
    me: require('./_me')
};

module.exports = async function handler(req, res) {
    const action = req.query && req.query.action;
    const actionHandler = handlers[action];

    if (!actionHandler) {
        return res.status(404).json({ success: false, error: 'Authentication route not found' });
    }

    return actionHandler(req, res);
};
