DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS locations;

-- this.search_query = locationName;
-- this.formatted_query = result.body.results[0].formatted_address;
-- this.latitude = result.body.results[0].geometry.location.lat;
-- this.longitude = result.body.results[0].geometry.location.lng;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_input VARCHAR(225),
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10,7)
);

CREATE TABLE weather ( 
    id SERIAL PRIMARY KEY, 
    search_input VARCHAR(225),
    forecast VARCHAR(255), 
    time VARCHAR(255), 
    location_id INTEGER NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations (id)
  );