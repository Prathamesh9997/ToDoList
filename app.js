
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public")); //To get access to static data i.e CSS files, images etc.

//Database connection with DB name as todoListDB
mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true});

//Create database schema
const itemsSchema = {
  name: String
};

const listSchema = {
  name: String,
  items: [itemsSchema]
};

//Create database model using created schema and specify collection name at 1st parameter (Item) which will automatically converts into items.
const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List", listSchema);

//Create document
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

//For GET request from users to homepage of our app
app.get("/", function(req, res) {

  //Checks weather items collection contains default items or not
  Item.find({}, function(err, foundItems){

    if (foundItems.length === 0) {
      //If default items not present into items collection then insert it for only 1st time
      Item.insertMany(defaultItems, function(err){
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully savevd default items to DB.");
        }
      });
      res.redirect("/");
    } else {
      //If default items already present into items collection then just dispay it and don't insert again.
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });
});


//For GET requests from users to custom lists (Express route parameter is used)
app.get("/:customListName", function(req, res){

  //Capitalize 1st letter of word
  const customListName = _.capitalize(req.params.customListName);

  //When user requests for custom list then it checks weather that list is present into lists collection or not
  List.findOne({name: customListName}, function(err, foundList){
    if (!err){
      if (!foundList){
        //Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //Show an existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
});


//For POST request from user to add new item into the list
app.post("/", function(req, res){

  //Catch the data coming from webpage i.e new item name and the list in which item will be placed
  const itemName = req.body.newItem;
  const listName = req.body.list;

  //New item creation on the fly
  const item = new Item({
    name: itemName
  });

  if (listName === "Today"){
    item.save();
    res.redirect("/");
  } else {
    //if it's custom list then 1st we find the list name into lists collection and then push that ite into the list
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

//For POST request from user to delete an item from the list
app.post("/delete", function(req, res){

  //Catches required data i.e item to be deleted and list in which that item is present
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err){
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/");
      }
    });
  } else {

    //Below is the pull method to delete an item which is present in the array inside the list, so we specify the list name(1st parameter), array name and item id(inside pull method)
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err){
        res.redirect("/" + listName);
      }
    });
  }
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
