# InfoSM
The [*Federal Food Safety and Veterinary Office (FSVO)*](https://www.blv.admin.ch/) of Switzerland provides the database *infoSM* (= information system for cases of notifiable diseases) which contains information on all outbreaks of notifiable **animal diseases** in Switzerland since 1991. More information about infoSM can be found [here](https://www.infosm.blv.admin.ch/public/?lang=de).

This application visualizes the data and allows its users to search and filter the contents. The application impelmented by [Research Center for Digital Sustainability](https://www.digitale-nachhaltigkeit.unibe.ch/) of the University of Bern, together with the Linked Data company [Zazuko](https://zazuko.com/). 

## Data
All data is stored as RDF Linked Data Tripples. The data is provied by FSVO and can be accessed over a SPARQL API created by Zazuko. You can use a query [Web-GUI](https://lindas-data.ch/sparql-ui/#) to test new queries and explore the data on your own.

## Operation and Maintenance
The live application is hosted by the company  [Begasoft](https://www.begasoft.ch/).
If you find problems in the source code please open a GitHub issue.

## Development
This project uses an slim [Express.js](https://expressjs.com/) backend. The frontend is powered by [Angular](https://angular.io/) SPA Framework. You are welcome to contribute to code improvements by sending us pull-requests of your suggested changes.

### Config
Since the config for development is not under version control, please add the following file: ***./config/devConfig.js*** with the content:


~~~js
module.exports = {
    use_cors: false,
    port: 5000,
}
~~~

In case you extend the app with any sensitive information like passwords or API keys you should store these **production config values** as environment variables on your Node.js server.

### Running the Application for Development
Install the backend dependencies with `npm install` and start up the node server on port 5000 by running `npm start`.

After navigating to *./angular* and running `npm install`, run `ng serve` to start-up the frontend on http://localhost:4200/. The app will automatically reload if you change any of the source files.

### Scaffolding of Additional Angular Code
Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build the App
Run `ng build --prod` in the *./angular* directory to build the project. The build artifacts will be stored in the *./dist/* directory.
