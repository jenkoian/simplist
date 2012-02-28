$(function() {

    window.Title = Backbone.Model.extend({
        defaults: function() {
            return {
                title: 'My Awesome List of Stuff (double click me to edit)'
            };
        },
        
        localStorage: new Store('title')
    });
    
    window.Percentage = Backbone.Model.extend({
        defaults: function() {
            return {
                width: 0
            };
        },
        
        localStorage: new Store('percentage')
    });    
    
    window.Simplist = Backbone.Model.extend({
        
        defaults: function() {
            return {
                done: false,
                order: Simplists.nextOrder()
            };
        },
        
        toggle: function() {
            this.save({done: !this.get('done')});
        }
    });
    
    window.SimplistList = Backbone.Collection.extend({
        
        model: Simplist,
        
        localStorage: new Store('simplists'),
        
        done: function() {
            return this.filter(function(simplist) { 
                return simplist.get('done'); 
            });
        },
        
        remaining: function() {
            return this.without.apply(this, this.done());
        },
        
        nextOrder: function() {
            if (!this.length) {
                return 1;
            }
            
            return this.last().get('order') + 1;
        },
        
        comparator: function(simplist) {
            return simplist.get('order');
        }
        
    });
    
    window.Simplists = new SimplistList;   
    
    window.SimplistView = Backbone.View.extend({
        
        tagName: 'li',
        
        template: _.template($('#item-template').html()),
        
        events: {
            'click .check': 'toggleDone',
            'dblclick div.simplist-text': 'edit',
            'click span.simplist-destroy': 'clear',
            'keypress .simplist-input': 'updateOnEnter',
            'click div.simplist-edit-description a': 'editDescription',
            'keypress .simplist-description-input': 'updateDescriptionOnEnter',
            'dblclick div.simplist-description': 'editDescription'
        },
        
        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },
        
        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            this.setText();
            this.setDescription();
            return this;
        },
        
        setText: function() {
            var text = this.model.get('text');
            this.$('.simplist-text').text(text);
            this.input = this.$('.simplist-input');
            this.input.bind('blur', _.bind(this.close, this)).val(text);
        },
        
        setDescription: function() {
            var desc = this.model.get('description');
            if (desc && desc.length) {                
                this.$('.simplist-description span').text(desc);
                this.$('.simplist-description a').remove();
            }
            this.inputDescription = this.$('.simplist-description-input');
            this.inputDescription.bind('blur', _.bind(this.closeDescriptionInput, this)).val(desc);            
        },
        
        toggleDone: function() {
            this.model.toggle();
        },
        
        edit: function() {
            $(this.el).addClass('editing');
            this.input.focus();
        },
        
        editDescription: function(e) {
            this.$('.simplist-description span').hide();
            this.$('.simplist-edit-description').addClass('editing');      
            e.preventDefault();
        },
        
        updateDescriptionOnEnter: function(e) {
            if (e.keyCode == 13) {
                this.closeDescriptionInput();
            }
        },
        
        closeDescriptionInput: function() {
            if (this.inputDescription.val() && this.inputDescription.val().length) {
                this.model.save({description: this.inputDescription.val()});
                this.$('.simplist-description span').show();
                this.$('.simplist-description a').remove();
                this.$('.simplist-edit-description').removeClass('editing');
            }
        },
        
        close: function() {
            if (this.input.val() && this.input.val().length) {
                this.model.save({text: this.input.val()});
                $(this.el).removeClass('editing');
            }
        },
        
        updateOnEnter: function(e) {
            if (e.keyCode == 13) {
                this.close();
            }
        },
        
        remove: function() {
            $(this.el).remove();            
        },
        
        clear: function() {
            this.model.destroy();            
        }        
        
    });
    
    window.AppView = Backbone.View.extend({
    
        phrases: ['Wrestle a panda bear', 'Tickle a monkey', 'Steal a car', 'Throw a TV out of a hotel window',
                    'Set fire to a toaster', 'Do the funky chicken', 'Lick a toad',
                    'Grow a moustache'],
        
        el: $('#simplistapp'),
                
        events: {
            'dblclick #simplist-title': 'editTitle',
            'keypress #simplist-title': 'createTitleOnEnter',
            'keypress #new-simplist': 'createSimplistOnEnter',
            'keyup #new-simplist': 'showTooltip',
            'click .simplist-clear a': 'clearCompleted'
        },
        
        initialize: function() {
            this.title = this.$('#simplist-title');
            this.input = this.$('#new-simplist');
            this.percentage = this.$('#percentage_bar');
            
            this.titleModel = new Title({id: 1});
            this.titleModel.fetch();
            
            this.percentageModel = new Percentage({id: 1});
            this.percentageModel.fetch();
            
            this.$('.simplist-title-h1').text(this.titleModel.get('title'));
            this.$('.percentage-span').width(this.percentageModel.get('width') + '%');
            
            this.input.attr('placeholder', this.getRandomListItem());
            
            Simplists.bind('add', this.addOne, this);
            Simplists.bind('reset', this.addAll, this);
            Simplists.bind('all', this.render, this);            
            Simplists.bind('destroy', this.setPercentage, this);  
            
            Simplists.fetch();
        },
        
        getRandomListItem: function() {
            var randomNumber=Math.floor(Math.random()*this.phrases.length)
            return this.phrases[randomNumber];
        },
        
        render: function() {            
            this.setTitleText();
            this.setPercentage();
        },
        
        addOne: function(simplist) {
            var view = new SimplistView({model: simplist});
            $('#simplist-list').append(view.render().el);
        },
        
        addAll: function() {
            Simplists.each(this.addOne);
        },
        
        editTitle: function() {            
            $(this.title).addClass('editing');
            this.$('.simplist-title-input').focus();            
        },
        
        setTitleText: function() {
            var text = this.titleModel.get('title');
            if (text.length) {
                this.$('.simplist-title-input').val(text);
                this.$('.simplist-title-input').bind('blur', _.bind(this.closeTitle, this)).val(text);
            }
        },  
        
        setPercentage: function() {            
            if (Simplists.length > 0) {
                var percentage = (Simplists.done().length / Simplists.length) * 100;                
                this.$('.percentage-span').animate({width: percentage+'%'},500);
                this.percentageModel.save({width: percentage});                
            } else {
                this.$('.percentage-span').animate({width: '0%'},500);
                this.percentageModel.save({width: 0});                
            }
        },  
        
        closeTitle: function() {
            var text = this.$('.simplist-title-input').val();
            this.titleModel.save({title: text});
            this.$('.simplist-title-h1').text(text);
            $(this.title).removeClass('editing');            
        },                
        
        createTitleOnEnter: function(e) {
            var text = this.$('.simplist-title-input').val();
            if (!text || e.keyCode != 13) {
                return;
            }                                               
            this.closeTitle();
        },        
        
        createSimplistOnEnter: function(e) {
            var text = this.input.val();
            if (!text || e.keyCode != 13) {
                return;
            }
            
            Simplists.create({text: text});
            this.input.val('');
            this.input.attr('placeholder', this.getRandomListItem());
        },
        
        clearCompleted: function() {
            _.each(Simplists.done(), function(simplist) {
                simplist.destroy();
            });
            return false;
        },
        
        showTooltip: function(e) {
            var tooltip = this.$('.ui-tooltip-top');
            var val = this.input.val();
            tooltip.fadeOut();
            if (this.tooltipTimeout) {
                clearTimeout(this.tooltipTimeout);
            }
            if (val == '' || val == this.input.attr('placeholder')) {
                return;
            }
            
            var show = function() {
                tooltip.show().fadeIn(); 
            };
            
            this.tooltipTimeout = _.delay(show, 1000);
        }      
    });
    
    window.App = new AppView;
    
});