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
        "Content": `Ho! Ho! Ho! \n, Welcome to Feliz Navidad - 12th Noel. Keep your number safe and wait for Santa! \n Download the program for today's event here https://vecbackend-production.up.railway.app/ \n We will keep you updated on all our events. Find videos from our events on our YouTube channel. https://www.youtube.com/@VocalEssenceChoraleGhana`
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

//Count the number of audiences that have attended a particular event
app.get('/count/:event', async (req, res) => {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('audiences').get();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.events_attended.includes(req.params.event)) {
                count++;
            }
        });

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

//Add new audience data to the database
app.post('/audience', async (req, res) => {
    try {
        const db = admin.firestore();
        // const users = [
        //     { category: "special", email: "", events_attended: [], firstname: "Mavis Hawa", lastname: "Koomson", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Georgina", lastname: "Wood", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "David", lastname: "Agyefi-Mensah", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Stephen", lastname: "Obeng-Amoako", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Akua", lastname: "Boateng", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "George K.", lastname: "Amakye", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Mr. And Mrs.", lastname: "Dua-Ansah", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Otu", lastname: "", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Eunice", lastname: "Tornyi", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Vida", lastname: "Brewu", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Sampson", lastname: "Agyapong", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Anthony", lastname: "Arthur", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "John", lastname: "Amoako Atta", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Abraham", lastname: "Quarmyne", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Dominic", lastname: "Derby", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Lordina", lastname: "The Soprano", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Jasmine", lastname: "Koomson", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Nathaniel", lastname: "Addy", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Alfred Patrick", lastname: "Addaquay", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Sophia", lastname: "Clement", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
        //     { category: "special", email: "", events_attended: [], firstname: "Jennifer", lastname: "Bonney", phone: "", registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" }
        // ];

        const users = [
            // { category: "regular", firstname: "Raymond", lastname: "Nortey", phone: "0244337629", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Ernest", lastname: "Markin", phone: "0503172000", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Ellen", lastname: "Aboagye", phone: "0548016071", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Emmanuel", lastname: "Bartey", phone: "0244698045", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Georgette", lastname: "Quaye", phone: "0249646229", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Emmanuel", lastname: "Anokye", phone: "0247139739", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Oge", lastname: "Nweke", phone: "0560317115", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Eric", lastname: "Afeavo", phone: "0243226016", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Abigail", lastname: "Addy", phone: "0244711233", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Kwaku", lastname: "Larbi", phone: "0546685067", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Akwasi", lastname: "Kay", phone: "0208728033", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Comfort", lastname: "Ackah", phone: "0540977796", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Maadjoa", lastname: "Ampofowaa", phone: "0246469177", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Ethel", lastname: "Hayford", phone: "0203187691", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Frederick", lastname: "Opoku", phone: "0249105636", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Obededom", lastname: "Ampomah", phone: "0279964936", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Isaac", lastname: "Daniel", phone: "0270406131", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            // { category: "regular", firstname: "Kofi", lastname: "Boateng", phone: "0241862650", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Eugenia", lastname: "Ghartey", phone: "0256285562", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Evelyn", lastname: "Ghartey", phone: "0244676543", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "William", lastname: "Ghartey", phone: "0277427477", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Mariam", lastname: "Ennin", phone: "0248695667", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Audrey", lastname: "McCarthy", phone: "0243319078", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Samuel", lastname: "Ackon", phone: "0205803333", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Jacob", lastname: "Agyiri", phone: "0264229036", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Maanaa", lastname: "Ansah", phone: "0203848840", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Annablessed", lastname: "Otu", phone: "0245678956", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Lorinda", lastname: "Quaye", phone: "0531863355", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Michael", lastname: "Nartey", phone: "0249696120", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Vero", lastname: "Osei", phone: "0244712658", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Diana", lastname: "Pabby", phone: "0244254009", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Anita", lastname: "Okyere", phone: "0553897601", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Nhyiraba", lastname: "Obeng", phone: "0249974160", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Markus", lastname: "Seyram", phone: "0242371118", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Faustina", lastname: "Serwaa", phone: "0578049523", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Rabby", lastname: "Musah", phone: "0591543040", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Kukua", lastname: "Larbi", phone: "0240154422", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Rebecca", lastname: "Laryea", phone: "0554022270", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Daniel", lastname: "Adjei Adjeyey", phone: "0244926966", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            //{ category: "regular", firstname: "Kwabena", lastname: "Amponsah", phone: "0554211444", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" }
            { category: "regular", firstname: "Kwabena", lastname: "Amponsah", phone: "0554211444", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Henrietta", lastname: "Cummey", phone: "0208489428", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Kofi", lastname: "Awotwe", phone: "0244476925", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Joshua", lastname: "Akrofi", phone: "0570561777", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Majorie", lastname: "Mensah", phone: "0203647541", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Jessica", lastname: "Larbi", phone: "0578566675", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Rosemond", lastname: "Asamadu", phone: "0597866536", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Baaba", lastname: "Awuah", phone: "0576764090", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Nana Ahemaa ", lastname: "Buabeng", phone: "0249305874", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Samuel", lastname: "Awuah", phone: "0535947826", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Nana Akosua", lastname: "Bosompra", phone: "0244443380", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Judith", lastname: "Botchway", phone: "0502375621", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Rita", lastname: "Konadu", phone: "0244633120", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Karl", lastname: "Dela", phone: "0243908974", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Anita", lastname: "Banfo", phone: "0558184045", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Lydia", lastname: "Gokah", phone: "0240659885", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Lois Nana ", lastname: "Bediako", phone: "0557826291", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Queenie", lastname: "Dsane", phone: "0570885725", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Cassandra", lastname: "Akromond", phone: "0256230996", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Akyea", lastname: "Obeng", phone: "0208161042", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Douglas", lastname: "Bruce", phone: "0244601594", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Ekow", lastname: "Onumah", phone: "0550027913", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Freda", lastname: "Achemapong", phone: "0548188757", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Wihelmina", lastname: "Hyde Hayford", phone: "0207254534", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Joy", lastname: "Adanu", phone: "0241839387", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Alwina", lastname: "Ansah", phone: "0557093397", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Ameyaw", lastname: "Emmanuel", phone: "0548840858", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Abigail's", lastname: "Owusu", phone: "0599435772", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Kofi", lastname: "Asare", phone: "0205753722", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Elorm", lastname: "Kumahor", phone: "0552990231", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Prince", lastname: "Frimpong", phone: "0242781850", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Jenifer", lastname: "Nginu", phone: "0552875822", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Bright", lastname: "Appiah", phone: "0241577833", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Jacoba", lastname: "Vanderpuje", phone: "0247635145", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Leonard", lastname: "Parkarh", phone: "0543252643", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Elizabeth", lastname: "Owusu", phone: "0248543891", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Kweku", lastname: "Essel", phone: "0244968164", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Jacqueline", lastname: "Osei", phone: "0501544134", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Margretta", lastname: "Nyarko", phone: "0200431773", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Dennis", lastname: "Inkabil", phone: "0530258527", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Daniella", lastname: "Annan", phone: "0266603722", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Gabriel", lastname: "Achemapong", phone: "0550240237", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Dorcas", lastname: "Cudjoe", phone: "0540197173", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Tracy", lastname: "Hibbert", phone: "055603240", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Amanda", lastname: "Abrokwah", phone: "0245875249", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Fiifi", lastname: "Jackson", phone: "0233204059", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Mercy", lastname: "Adomaah", phone: "0541836811", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Dorcas", lastname: "Ackwerh", phone: "02442527415", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Opats Charles ", lastname: "Doku", phone: "0546683634", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Eunice", lastname: "Tornyi", phone: "02427553523", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" },
            { category: "regular", firstname: "Sharon", lastname: "Otoo", phone: "0248649126", events_attended: ["fn11"], registered_by: "admin", registered_on: "29 September 2023 at 22:44:17 UTC+2" }
        ];


        const batch = db.batch();

        users.forEach(user => {
            const docRef = db.collection('audiences').doc();
            batch.set(docRef, user);
        });

        await batch.commit();

        res.json({ message: 'Audience data added successfully' });
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
