
const
  express = require('express'),
  app = express(),
  http = require('http').Server(app),
  cors = require('cors'),
  fs = require('fs'),
  multer = require('multer'),
  path = require('path'),
  mongoose = require('mongoose'),
  storage =   multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './public/uploads');
    },
    filename: function (req, file, callback) {
         callback(null, `${file.fieldname}_${Date.now()}_${file.originalname}`);
    }

}),
  upload = multer({ storage : storage, limits: { fieldSize: 10 * 1024 * 1024 }}).single('image'),
   Users = require('./models/users'),
   Posts = require('./models/posts'),
   Comments = require('./models/comments'),
   Notifications = require('./models/notefics'),
// connect to the database
 //   mongoose.connect('mongodb://nearby:nearby@127.0.0.1/nearBy',{ useNewUrlParser: true });
 WebSocket = require('ws'),
 
 wss = new WebSocket.Server({
  port: 8080,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed.
  }
});
 mongoose.connect('mongodb://sagaradmin:sagarpass@127.0.0.1/sagar');
app.use(cors());
app.use(express.static('www'));
app.use(express.static(path.join(__dirname, 'public')));
// home
app.get('/', (req, res) => {
  res.send('Unknown origin.');
});

app.post('/imagePost',(req, res)=>{
   upload(req, res, function (err) {
            if (err)
                console.log(err);
           else{
              var url = req.body.url+'//uploads/';
                var pic = url + req.file.filename,
                 userId  = req.body.info;
                res.status(201).json(pic);
                deleteImage(userId);
                Users.updateOne({'_id': userId}, {$set: {'pic': pic}}, function (err) {
                    if (err)
                        throw err;
                }); 
           }

        })
})
app.post('/imagePost1',(req, res)=>{
   upload(req, res, function (err) {
            if (err)
                console.log(err);
           else{
              var data = JSON.parse(req.body.data),
                url = data.url+'//uploads/';
                data.img = url + req.file.filename;
                savePost(data, function(saveMessage){
                  res.status(201).json({message:'Post has been successfully uploaded.'});
                });
             }

        })
})


// setup socket.io
wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

wss.on('connection', function(socket){
    console.log('connected')

  socket.on('message', function(dataAttach){
   dataAttach = JSON.parse(dataAttach);
   var data = dataAttach.data;
   switch(dataAttach.action){
     case 'SIGN UP':
      Users.findOne({'email': data[1]}, {connections: 0},function (err, user) {
                  if(err)
                     throw err;
                  if(user)
                      info = {errorMessage:"Email is already registered"};
                   else{
                      var newUser = new Users();
                      var random_number = Math.floor((Math.random()) * (999999 - 100000)) + 100000;
                      newUser.userId = Date.now();
                      newUser.email = data[1];
                      newUser.userName = data[0];
                      newUser.password = newUser.generatHarsh(data[2]);
                      newUser.gender = null;
                      newUser.facebook = false;
                      newUser.requests = 0 ;﻿
                      newUser.notifications = 0;
                      newUser.noConnections = 0 ;﻿
                      newUser.instagram = false;
                      newUser.status = 'active' //random_number;
                      info = newUser;
                      newUser.save(function(err){
                          if(err)console.log(err); });
                      }
                    socket.send(JSON.stringify({
                       action: dataAttach.action,
                       data:info
                    }));
                });
     break;
     case 'LOGIN':
            var email_or_usenrname = data[0];
            Users.findOne({$or: [{'email': email_or_usenrname}, {'userName': email_or_usenrname}]}, {connections: 0,__v: 0}, function (err, res) {
                   if(err)
                       throw err;
                    if(!res){
                      info =  {errorMessage:'Email/user name is not registered'};
                   }else if(!res.validPassword(data[2])){
                       info =  {errorMessage:'Password does not match.'};
                   }else{
                        res.password = undefined;
                       info = res;
                   }
                    socket.send(JSON.stringify({
                       action: dataAttach.action,
                       data:info
                    }));
               });

     break;
     case 'updateUser':
      Users.updateOne({_id:data._id},{$set:data},function(err,res){
        if(err)
          throw err
      })
     break;
      case 'fetchUsers':
          returnSearch(data.val,null,function(res){
                 socket.send(JSON.stringify({
                        action: 'userFound',
                        datam: (res.length?res:null)
                    }));
          })
        break;
        case 'checkUser':
       
        if(!data.owner){
            Users.aggregate([
                {$match:{'_id': new mongoose.Types.ObjectId(data.ownerId)}},
                {$unwind:{path: "$connections"}},
                {$match:{'connections.id': data.userId}},
                {$project: {"connections": 1, _id:0}}
              ]).exec(function(err, res){
                  if(err)
                 throw err
               var status;
                if(!res.length)
                  status = 'Connect'
                else
                  status = res[0].connections.status;
                socket.send(JSON.stringify({
                    action: 'connectionStatus',
                    datam: {status:status,to: data.userId, from:data.ownerId,  owner:data.ownerId}
                }));
              })
        }
        
        break;
        case 'checkConnectsAndPost':
              Users.aggregate([
                  {$match: {_id: new mongoose.Types.ObjectId(data.userid)}},
                  {$unwind:"$connections"},
                  {"$group": {"_id": "$_id", 
                        "connections": {"$push": "$connections"}
                    } },
                  {$match:{'connections.status':'Disconnect'}},
                  {"$project": {"_id": 0,
                          "connections": "$connections"}
                   }
                ]).exec(function(err, connections){
                  if(err)
                     throw err
                   else if(connections.length)
                   var connects = connections[0].connections.map(a=>a.id.toString());
                  Users.find({_id:{$in:connects}}, {userName: 1, firstName:1,lastName:1, pic: 1},function(err,connections){
                    if(err)
                       throw err
                     else
                      getUserPosts(data.userid,function(posts){
                        socket.send(JSON.stringify({
                          action: 'userConnects',
                          datam: {connects:connections, posts:posts}
                        }));
                      })
                     
                  })
                })


         break;
        case 'searhcConnection':
          returnSearch(data.val,data.userId, function(res){
              var ids = res.map(a =>a._id.toString());
              Users.aggregate(
                [{$match:{_id:new mongoose.Types.ObjectId(data.userId)}},
                  {$unwind:"$connections"},
                  {"$group": {"_id": "$_id", 
                        "connections": {"$push": "$connections"}
                    } },
                  {$match:{'connections.id':{$in:ids},'connections.status':{$in:data.tab}}},
                  {"$project": {"_id": 0,
                          "connections": "$connections"}
                   }
                ]).exec(function(err, res0){
                   if(err)
                     throw err;
                   var usersFound = []
                      if (res0.length){
                           usersFound = res.map(x => Object.assign(x, res0.find(y => y._id == x._id)))
                        }
                      socket.send(JSON.stringify({
                        action: 'searchFound',
                        datam: usersFound.filter((user)=>{return user._id !== data.us})
                    }));

                })
          });

        break;
        case 'actionConnection':
           if(data.action == 'Connect'){
              addFriendToArray(data.userId, data.ownerId, 'Accept Connection',data.ownerId);
              addFriendToArray(data.ownerId, data.userId, 'Remove request',data.ownerId);
           }else if(data.action == 'Accept Connection'){
             updateFriendToArray(data.userId, data.ownerId)
             updateFriendToArray(data.ownerId, data.userId)
             broadCast(JSON.stringify({
                  action: 'connectionStatus',
                  datam:{status:'Disconnect',first: true, from:data.ownerId, to:data.userId,owner:data.ownerId}
              }));
           }else if(data.action == 'Remove request' || data.action == 'Disconnect'){
             removeFriendFromArray(data.userId, data.ownerId)
             removeFriendFromArray(data.ownerId, data.userId)
             broadCast(JSON.stringify({
                  action: 'connectionStatus',
                  datam:{status:'Connect',from:data.ownerId, to:data.userId,owner:data.ownerId}
              }));
           }
         break;
         case 'checkNotes':
             fetchConnections(data.user_id,data.all,function(connects){
               if(data.getInfo){
                  var userIds = connects.map(a=>a.connections.id);
                Users.find({'_id':{$in:userIds}}, {pic:1,userName:1,lastName:1,firstName:1},function(err, res){
                  if(err)
                    throw err
                  else
                     socket.send(JSON.stringify({
                        action:'awaitingConnections',
                        datam: {connections:res, all:data.all}
                    }));
                })
              }
              else{

                 
                  Users.findOne({_id:data.user_id},{notes:1, _id:0, notifications:1},function(err, user){
                      if(err)
                         throw err;
                       else 
                         socket.send(JSON.stringify({
                              action:'awaitingConnections',
                              datam: {connections:connects, all:data.all,user:user}
                          }));

                  })
                }
             })

          break;
          case 'updateNotification': 
             Users.updateOne({_id:data.userId}, {$inc:{notifications:-1}}, function(err, res){
                if(err)
                   throw err
                 else
                   Notifications.updateOne({_id:data.commentId}, {$addToSet:{readers:data.userId}}, function(err, res){
                     if(err)
                       throw err;
                   })
             })
           break;
          case 'fetchNotifications':
           Notifications.find({postId:{$in:data.ids}, 'user.userName':{$ne:data.userName}},function(err, notes){
               if(err)
                 throw err;
               else 
                socket.send(JSON.stringify({
                    action:'foundNotes',
                    datam: {notes:notes}
                }));
           }).sort({'id':-1});
           break;
          case 'uploadPost':
            savePost(data, function(saveMessage){
              if(saveMessage)
                  socket.send(JSON.stringify({
                    action:'postUploaded',
                    datam: {message:'Post has been successfully uploaded.'}
                }));
            });
          break;
          case 'fetchPosts':
            Posts.aggregate([
              {$group: { _id: { latitude : "$location.lat", longitude : "$location.lng"},
                    actions:{$addToSet:{action:"$action",text:"$text", time:"$time",place:"$location.place",
                    date:"$date", byId:'$byId',img:"$img", likes:"$likes", comments:"$comments", id:"$_id", orderTime:"$id"}}
                 }
               }
            ]).exec(function(err, posts){
              if(err)
                 throw err
               else 
               socket.send(JSON.stringify({
                    action:'foundPosts',
                    datam: {posts:posts}
                }));            
           })
          break;
          case 'sendDataFetchPostOwners':
             Users.find({_id:{$in:data.byIds}}, {userName: 1, firstName:1,lastName:1, pic: 1, _id: 1}, function(err, users){
                if(err)
                   throw(err)
                 else 
                   socket.send(JSON.stringify({
                     action:'userPostsData',
                     datam: {users:users}
                }));   
             })
           break;
           case 'getPost':
             Posts.findOne({_id:data.id}, function(err, post){
              if(err)
                 throw err
               else
                returnUsers([post.byId],(owners)=>{
                  returnUsers(post.likeIds,(likers)=>{
                     returnComments(post._id, 0, function(comments){
                        var userIds = comments.map(a=>a._id)
                        returnUsers(userIds,function(users){
                           var comments0 = comments.map((comm)=>{
                            comm.user = users[users.findIndex(q =>q._id.toString() == comm._id)]
                             return comm
                          })
                          socket.send(JSON.stringify({
                             action:'foundPost',
                             datam: {owner:owners[0],post:post,likers:likers, comments:comments0}
                        }));
                        })
                     })
                    })
                })
             })
           break;
           case 'likeDislike':
             Posts.findOne({_id:data.postId, 'likeIds':data.myId},{_id:1},function(err, res){
               if(err)
                  throw err
                else{
                  var update;
                 if(res){
                    if(data.action == 'Dislike')
                       update = {$inc:{likes:-1},$pull:{"likeIds":data.myId}};
                 }
                 else {
                    if(data.action == 'Like')
                      update = {$inc:{likes:1},$addToSet:{"likeIds":data.myId}};
                    makeNotification(data,'like')
                 }
                  Posts.updateOne({_id:data.postId}, update, function(err, res){
                    if(err)
                       throw err
                     //sendNotifications
                  })
               }
             })
           break;
           case 'newPostComment':
               var dta = {
                action:'newPostComment',
                datam:data
               }
             makeNotification(data,'comment')

              Posts.updateOne({_id:data.postId}, {$inc:{comments:1}}, function(err){
                 if(err)
                   throw err;
                  else
                    Comments.findOne({_id:data.postId},{_id:1}, function(err, post){
                      if(err)
                         throw err
                       else if(!post){
                        var newComment = new Comments()
                          newComment._id  = data.postId;
                          newComment.comments = [data];
                          newComment.save(function(err, res){
                            if(err)
                               throw err;
                             else
                             broadCast(JSON.stringify(dta))
                          }) 
                       }
                       else 
                        Comments.updateOne({_id:data.postId},{$push:{comments:data}}, function(err, res){
                            if (err)
                               throw err;
                             broadCast(JSON.stringify(dta))
                        })

                    })
              })
           break;
   }
  })
});
function returnUsers(ids,callback){
   Users.find({_id: {$in:ids}}, {userName: 1, firstName:1,lastName:1, pic: 1, _id: 1}, function(err, users){
        if(err)
           throw(err)
         callback(users)
     })
}
function makeNotification(data, action){
   var newNote = new Notifications(),
    userId =  (data.action=='Like'?data.myId:data._id),
    now = new Date;
       newNote.date = now.toString().substr(0,15);
       newNote.time = formatAMPM(now) ;
       newNote.id = now;
       newNote.postOwner = data.byName;
       newNote.postId = data.postId;
       newNote.text = action;
       newNote.user = data.user;
       newNote.save(function(err){if(err)throw err;})
      Posts.findOne({_id:data.postId},{likeIds:1,_id:0},function(err, res){
         if(err)
            throw err;
          else
            Comments.findOne({_id:data.postId},{'comments._id':1,_id:0}, function(err, cmmntIds){
             if(err)
               throw err;
             else if(cmmntIds){
               cmmntIds = cmmntIds.comments.map(a=>a._id)
               var ids = cmmntIds.concat(res.likeIds).filter((el, i, a) => i === a.indexOf(el)).filter((a)=>{
                  return a != newNote.user.id;
                 })
               Users.updateMany({_id:{$in:ids}},{$inc:{'notifications':1}, $addToSet:{notes:newNote.postId}},function(err, res){
                  if(err)
                     throw err
               })
             }
          })
      })
   
}
function returnComments(postId, from, callback){
  Comments.aggregate([
      {$match:{_id:postId.toString()}},
      {$unwind:"$comments"},
      {$group: {"_id": null, comments:{$addToSet:"$comments"}}},
      {$project:{comments:1, _id:0}}
    ]).exec(function(err, res){
       if(err)
         throw err
       else {
        var comments = res && res[0]?res[0].comments:[];
        callback(comments);

       }
    })
}
function savePost(post, callback){
  var now = new Date;
  var newPost = new Posts();
      newPost.id = Date.now();
      newPost.action = post.action;
      newPost.byId = post.byId;
      newPost.byName = post.byName;
      newPost.location = post.location;
      newPost.comments = 0;
      newPost.likes = 0;
      newPost.img = post.img;
      newPost.text = post.text;
      newPost.date = now.toString().substr(0,15);
      newPost.time = formatAMPM(now) ;
      newPost.save(function(err, res){
        if(err)
          throw err
        else callback('saved');
      })
      
}
function getUserPosts(id, callback){
  Posts.find({byId:id},function(err, res){
    if(err)
      throw err;
    else callback(res)
  })
}
function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}
function fetchConnections(userId,all,callback){
   Users.aggregate([
               {$match:{_id: new mongoose.Types.ObjectId(userId)}},
               {$unwind:{path: "$connections"}},
               {$match:{'connections.status': (all?'Disconnect':'Accept Connection')}},
               {$project: {"connections.id": 1, "connections.status": 1, _id:0}}
             ]).exec(function(err, res){
               if(err)
                  throw err
               callback(res)
               
   })
}
function returnSearch (id, userId, callback){
    Users.find({_id:{$ne:userId},$or:[{"userName" : { '$regex' : id, '$options' : 'i' }},
                        {"firstName" : { '$regex' : id, '$options' : 'i' }},
                        {"lastName" : { '$regex' : id, '$options' : 'i' }}]},
            {userName: 1, firstName:1,lastName:1, pic: 1, _id: 1}, function (err, res) {
            if(err)
                throw err;
            else
              callback(res)
        });
}
function addFriendToArray(id,friendId,status,owner){
  Users.updateOne({_id:id},{$push:{connections:{id:friendId,status:status}}},function(err,res){
    if(err)
       throw err;
     broadCast(JSON.stringify({
          action: 'connectionStatus',
          datam:{status:status,from:id,to:friendId, owner:owner}
      }));
  })
}
function updateFriendToArray(id,friendId){
  Users.updateOne({_id:id,'connections.id':friendId},
    {$set:{'connections.$.status':'Disconnect'}},function(err,res){
    if(err)
       throw err;
   
  })
}
function removeFriendFromArray(id,friendId){
     Users.update({_id:id},{$pull:{connections:{id:friendId}}}, function(err, res){
         if(err)
           throw err
     })
}
function deleteImage(userId){
   Users.findOne({'_id': userId}, {pic:1, _id:0}, function (err, user) {
          if (err)
              throw err;
          else if(user.pic){
           var rem = 'public/'+user.pic.split('//')[2];
              if (user.pic !== 'avatar') {
                     fs.unlink(rem, function (e) {
                  });
              }
          }
      });
}

function broadCast(data){
    wss.clients.forEach(function each(client){
      if (client.readyState === WebSocket.OPEN) {
       client.send(data);
    }
    })
}

const port = process.env.PORT || 3001;
http.listen(port, () => {
  console.log('listening on port', port);
});

