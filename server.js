// APP dependencies
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pg = require('pg');
const superagent = require('superagent');


// Global variables
const PORT = process.env.PORT;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const DARKSKY_API_KEY = process.env.DARKSKY_API_KEY;
const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const client = new pg.Client(process.env.DATABASE_URL);

client.connect();
client.on('error',
  error => {
    console.error(error);
  })


// Construct server with dependency objects
const app = express();
app.use(cors());

// Use express to get location data
app.get('/location', searchToLatLng);

// Use express to get weather data
app.get('/weather', searchWeather);

// function to check DB for existing table
const existsInDB = function(tableName, data) {
  let queryString = `SELECT * FROM ${tableName} WHERE search_input=$1`;

  return client.query(queryString, [data])
    .then(sqlResult => {
      return sqlResult.rowCount === 0 ? false : true;
    });
};

// Location db/api retrieval function
function searchToLatLng(request, response) {
  const locationName = request.query.data;
  const geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${locationName}&key=${GEOCODE_API_KEY}`;
  const tableName = 'locations';

  existsInDB(tableName, locationName).then( tableExists => {
    console.log(tableExists);

    client.query(`SELECT * FROM locations WHERE search_input=$1`, [locationName])
      .then(sqlResult => {

        if(!tableExists) {
          console.log('retrieving from google');

          superagent.get(geocodeURL)
            .then(result => {

              let location = new LocationConstructor(result.body, locationName);

              client.query(
                `INSERT INTO locations (
                search_input,
                search_query, 
                formatted_query,
                latitude,
                longitude
              ) VALUES ($1, $2, $3, $4, $5)`,
                [location.search_input, location.search_query, location.formatted_query, location.latitude, location.longitude]
              )

              response.send(location);

            }).catch(error => {
              console.error(error);
              response.status(500).send('Status 500: Life is hard mang.');
            })
        } else{
          console.log('sent from DB');
          response.send(sqlResult.rows[0]);
        }
      });
  });

}

// constructor function to build weather objects
function LocationConstructor(geoData, searchLocation) {
  this.search_input = searchLocation;
  this.search_query = searchLocation;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

//
function searchWeather(request, response) {
  const locationName = request.query.data;
  const darkskyURL = `https://api.darksky.net/forecast/${DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  const tableName = 'weather';

  existsInDB(tableName, locationName).then( tableExists => {
    console.log(tableExists);

    client.query(`SELECT * FROM weather WHERE search_input=$1`, [locationName])
      .then(sqlResult => {

        if(!tableExists) {
          console.log('retrieving from darksky');

          superagent.get(darkskyURL)
            .then(result => {

              let weather = result.body.daily.data.map( element => new WeatherConstructor(element));

              client.query(
                `INSERT INTO weather (
                search_input,
                forecast,
                time
              ) VALUES ($1, $2, $3)`,
                [weather.search_input, weather.forecast, weather.time]
              )

              response.send(weather);

            }).catch(error => {
              console.error(error);
              response.status(500).send('Status 500: Life is hard mang.');
            })
        } else{
          console.log('sent from DB');
          response.send(sqlResult.rows[0]);
        }
      });
  });
}


// function searchWeather(request, response) {

//   console.log(darkskyURL);
//   superagent.get(darkskyURL)
//     .then(result => {
//       let weather = result.body.daily.data.map( element => new WeatherConstructor(element));
//       response.send(weather);
//     }).catch(error => {
//       console.error(error);
//       response.status(500).send('Status 500: Life is hard mang.');
//     })
// }

//

// constructor function to build weather objects
function WeatherConstructor(element, searchLocation) {
  this.search_input = searchLocation;
  this.forecast = element.summary,
  this.time = new Date(element.time * 1000).toDateString()
}

//Search Eventbrite

app.get('/events',searchEventbrite);

function searchEventbrite(request,response){
  const eventBriteURL = `https://www.eventbriteapi.com/v3/events/search/?location.longitude=${request.query.data.longitude}&location.latitude=${request.query.data.latitude}&expand=venue&token=${EVENTBRITE_API_KEY}`;

  superagent.get(eventBriteURL)
    .then(result => {
      let eventData = result.body.events.map( event => new EventConstructor(event.url, event.name.text, event.start.local, event.summary));
      response.send(eventData);
    }).catch(error => {
      console.error(error);
      response.status(500).send('Status 500: Sadly, Events are not working');
    });
}

function EventConstructor(link, name, event_date, summary){
  this.link = link;
  this.name = name;
  this.event_date = new Date(event_date).toDateString();
  this.summary = summary;
}

// Error handling
app.use('*', (request, response) => {
  response.send('you got to the wrong place');
})

// Start the server
app.listen(PORT, () => {
  console.log(`app is up on port ${PORT}`)
})
