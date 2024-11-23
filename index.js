const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const cors = require('cors');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

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
        "From": "VECGhana",
        "To": number,
        "Content": `Ho! Ho! Ho! \n + , Welcome to Feliz Navidad 11. Your registration number is ${userdata.regNumber}. Keep this number safe and wait for Santa! \n We will keep you updated on all our events. Find videos from our events on our YouTube channel. https://www.youtube.com/@VocalEssenceChoraleGhana`
    });


    // let data = JSON.stringify({
    //     "From": "VECGhana",
    //     "To": number,
    //     "Content": "Ho! Ho! Ho! \n + , Feliz Navidad 11 comes off on 24th Nov. 2024 at the Victory Bible Church International, Awoshie- Baah Yard. \nPurchase tickets at https://egtks.com/e/48468 or dial *713*33*762# \nCome ready to praise and dance your way into Christmas and the new year. We have lots of gifts for you as well. Don't miss out!"
    // });



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


app.get('/count', async (req, res) => {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('audiences').get();
        const count = snapshot.size;
        res.json({ count });
    } catch (error) {
        res.status(500).send(error.message);
    }
});



app.get('/export', async (req, res) => {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('audiences').get();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Audiences');

        worksheet.columns = [
            // { header: 'ID', key: 'id', width: 30 },
            { header: 'First Name', key: 'firstname', width: 20 },
            { header: 'Last Name', key: 'lastname', width: 20 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Category', key: 'category', width: 20 },

            // { header: 'Events Attended', key: 'events_attended', width: 30 },


            // { header: 'Registered By', key: 'registered_by', width: 20 },
            // { header: 'Registered On', key: 'registered_on', width: 30 }
        ];

        snapshot.forEach(doc => {
            const data = doc.data();
            worksheet.addRow({
                id: doc.id,
                category: data.category,
                email: data.email,
                events_attended: JSON.stringify(data.events_attended),
                firstname: data.firstname,
                lastname: data.lastname,
                phone: data.phone,
                registered_by: data.registered_by,
                registered_on: data.registered_on
            });
        });

        const filePath = path.join(__dirname, 'audiences.xlsx');
        await workbook.xlsx.writeFile(filePath);

        res.json({ message: 'Excel file has been saved', filePath });
    } catch (error) {
        res.status(500).send(error.message);
    }
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
