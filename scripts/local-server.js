// Local development server for CollegeVote
// Serves static frontend assets and executes Vercel-compatible serverless functions

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public');
const projectPath = (...segments) => path.join(PROJECT_ROOT, ...segments);

// Load environment variables from .env
const envPath = projectPath('.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
                const key = trimmed.slice(0, eqIdx).trim();
                const val = trimmed.slice(eqIdx + 1).trim();
                if (!process.env[key]) {
                    process.env[key] = val;
                }
            }
        }
    });
}

const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Route matching for API handlers
function getApiHandler(pathname, req) {
    const parts = pathname.split('/').filter(Boolean); // e.g. ['api', 'students', '1']
    if (parts[0] !== 'api') return null;

    if (parts.length === 2 && parts[1] === 'health') {
        return require(projectPath('api/health'));
    }

    if (parts[1] === 'auth') {
        const action = parts[2];
        if (action) {
            req.query.action = action;
            return require(projectPath('api/auth/[action]'));
        }
    }

    if (parts[1] === 'students') {
        if (parts.length === 2) return require(projectPath('api/students/index'));
        if (parts[2] === 'me') return require(projectPath('api/students/me'));
        return require(projectPath('api/students/[id]'));
    }

    if (parts[1] === 'candidates') {
        if (parts.length === 2) return require(projectPath('api/candidates/index'));
        return require(projectPath('api/candidates/[id]'));
    }

    if (parts[1] === 'elections') {
        if (parts.length === 2) return require(projectPath('api/elections/index'));
        return require(projectPath('api/elections/[id]'));
    }

    if (parts[1] === 'votes') {
        return require(projectPath('api/votes/index'));
    }

    if (parts[1] === 'results') {
        return require(projectPath('api/results/[id]'));
    }

    return null;
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Enhance res with Vercel/Express-like helpers
    res.status = function(code) {
        this.statusCode = code;
        return this;
    };

    res.json = function(data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
        return this;
    };

    // Attach parsed query to req.query
    req.query = parsedUrl.query;

    // Check if it's an API request
    if (pathname.startsWith('/api/')) {
        const handler = getApiHandler(pathname, req);
        if (handler) {
            try {
                await handler(req, res);
            } catch (err) {
                console.error(`Error in ${pathname}:`, err);
                if (!res.writableEnded) {
                    res.status(500).json({ success: false, error: 'Internal Server Error' });
                }
            }
            return;
        } else {
            return res.status(404).json({ success: false, error: 'API route not found' });
        }
    }

    // Default root path to index.html
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Prevent directory traversal attacks
    const filePath = path.resolve(PUBLIC_ROOT, `.${pathname}`);
    if (filePath !== PUBLIC_ROOT && !filePath.startsWith(`${PUBLIC_ROOT}${path.sep}`)) {
        return res.status(403).end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>404 Not Found</title><link rel="stylesheet" href="/assets/css/style.css"></head>
                <body style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">
                    <div>
                        <h1 style="font-size:3rem;margin-bottom:8px;">404</h1>
                        <p style="color:var(--text-secondary);margin-bottom:16px;">The requested page could not be found.</p>
                        <a href="/index.html" class="btn btn-primary">Return Home</a>
                    </div>
                </body>
                </html>
            `);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🗳️  CollegeVote Server is running!`);
    console.log(`🌐 Local URL:  http://localhost:${PORT}`);
    console.log(`👥 Students:   http://localhost:${PORT}/student-login.html`);
    console.log(`🛡️  Admin:      http://localhost:${PORT}/admin-login.html`);
    console.log(`📊 Health:     http://localhost:${PORT}/api/health`);
    console.log(`=================================================\n`);
});
