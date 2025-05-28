const express = require('express');
const app = express();

const { handleWebhookGolangEngine } = require('./handlers');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/webhook/golangengine', (req, res) => {
    if(!req.body) return res.status(400).json({ code: 400, results: { message: 'body not found' } })
    if(!req.body.type) return res.status(400).json({ code: 400, results: { message: 'type not found' } })

    if (!req.headers?.authorization || (req.headers?.authorization !== global.golangEngine?.keyWebhook)) {
        return res.status(401).json({ code: 401, results: { message: 'Unauthorized' } })
    }

    handleWebhookGolangEngine(req.body)
    return res.status(200).json({ code: 200, results: { message: 'ok' } })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});