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


const admin = require('firebase-admin');

const serviceAccount = require('./vecapp.json'); // Replace with the actual path to your service account key JSON file

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://vecapp-381db.firebaseio.com' // Replace with your Firebase project URL
});

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
        "Content": "Hello " + userdata.firstname + ", Welcome to Feliz Navidad 10. Your registration was successful. We will keep you updated on all our events. Find videos from our events on our YouTube channel. https://www.youtube.com/@VocalEssenceChoraleGhana"
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


app.post('/sendBulk', (req, res) => {
    const message = req.body.message;

    //Fetch all numbers from database
    const db = admin.firestore();
    const usersRef = db.collection('audiences');
    const phoneNumbers = [];

    usersRef.get().then((snapshot) => {
        snapshot.forEach((doc) => {
            console.log(doc.id, '=>', doc.data());
            const userdata = doc.data();
            //Format number
            let number = userdata.phone;
            number = fomatNumber(number);
            phoneNumbers.push(number);
        });
    }).then(() => {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", "Basic aG9wdWN4eXg6cnpxZXB4dWk=");

        var raw = JSON.stringify({
            "From": "VEC@10",
            "Recipients": phoneNumbers,
            "Content": message
        });

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };

        fetch("https://sms.hubtel.com/v1/messages/batch/simple/send", requestOptions)
            .then(response => response.text())
            .then(result => console.log(result))
            .then(res.json({
                message: 'SMS received and processed successfully!',
                code: 200
            }))
            .catch(error => console.log('error', error));
    }).catch((err) => {
        console.log('Error getting documents', err);
        res.json({
            message: 'SMS not sent!',
            code: 500
        });
    });
});


const fomatNumber = (number) => {
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

    return number;
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
