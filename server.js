// APP dependencies
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Global variables
const PORT = process.env.PORT;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const DARKSKY_API_KEY = process.env.DARKSKY_API_KEY;
const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;

// Construct server with dependency objects
const app = express();
app.use(cors());
const superagent = require('superagent');

// Use express to get location data
app.get('/location', searchToLatLng);

// Performs task of building object from JSON file
function searchToLatLng(request, response) {
  const locationName = request.query.data;
  const geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${locationName}&key=${GEOCODE_API_KEY}`;

  superagent.get(geocodeURL)
    .then(result => {
      let location = new LocationConstructor(result.body);
      location.search_query = locationName;

      response.send(location);
    }).catch(error => {
      console.error(error);
      response.status(500).send('Status 500: Life is hard mang.');
    })
}

// constructor function to build weather objects
function LocationConstructor(geoData) {
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;

}


// Use express to get weather data
app.get('/weather', searchWeather);

function searchWeather(request, response) {
  const darkskyURL = `https://api.darksky.net/forecast/${DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  console.log(darkskyURL);
  superagent.get(darkskyURL)
    .then(result => {
      let weather = result.body.daily.data.map( element => new WeatherConstructor(element));
      response.send(weather);
    }).catch(error => {
      console.error(error);
      response.status(500).send('Status 500: Life is hard mang.');
    })
}

// constructor function to build weather objects
function WeatherConstructor(element) {
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
