const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const cors = require('cors');

app.use(bodyParser.json());
// app.use(cors());
app.use(cors({
    origin: '*'
}));

app.post('/sms', (req, res) => {
    // Handle the SMS request here
    console.log('Received SMS request:', req.body);
    const userdata = req.body;
    //Format number
    let number = userdata.phone;


    if (number.startsWith('0') && number.length == 10) {
        number = number.replace('0', '233');
    }

    if (number.startsWith('+') && number.length == 13) {
        number = number.replace('+', '');
    }

    if (number.startsWith('233') && number.length == 12) {
        number = number;
    }

    if (number.includes(' ')) {
        number = number.replace(' ', '');
    }

    let data = JSON.stringify({
        "From": "VEC@10",
        "To": number,
        "Content": "Hello " + userdata.firstname + ", Welcome to Harmony Of A Decade. Your registration was successful. We will keep you updated on all our events. Download the brochure here https://bit.ly/vechod ."
    });



    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://sms.hubtel.com/v1/messages/send',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic aG9wdWN4eXg6cnpxZXB4dWk='
        },
        data: data
    };

    axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            res.json({
                message: 'SMS received and processed successfully!',
                code: 200
            });
        })
        .catch((error) => {
            console.log(error);
            res.json({
                message: 'SMS not sent!',
                code: 500
            });
        });

});

app.get('/test', (req, res) => {
    // Handle the SMS request here
    console.log('Received SMS request:', req.body);

    // Respond with a confirmation message
    res.json({ message: 'SMS received and processed successfully!' });
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
