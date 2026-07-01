from django.db import models


class AppUser(models.Model):
    username = models.CharField(max_length=50, unique=True)
    email = models.CharField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    nickname = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'

    def __str__(self):
        return self.username


class Category(models.Model):
    name = models.CharField(max_length=50)
    parent = models.ForeignKey('self', on_delete=models.DO_NOTHING, null=True, blank=True, related_name='children')
    user = models.ForeignKey(AppUser, on_delete=models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'categories'

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        managed = False
        db_table = 'tags'

    def __str__(self):
        return self.name


class Post(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.DO_NOTHING)
    category = models.ForeignKey(Category, on_delete=models.DO_NOTHING, null=True, blank=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'posts'

    def __str__(self):
        return self.title


class Conversation(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.DO_NOTHING)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'conversations'

    def __str__(self):
        return self.title


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.DO_NOTHING)
    role = models.CharField(max_length=20)
    content = models.TextField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'messages'

    def __str__(self):
        return f"[{self.role}] {self.content[:30]}"


class Quiz(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.DO_NOTHING)
    category = models.ForeignKey(Category, on_delete=models.DO_NOTHING, null=True, blank=True)
    quiz_type = models.CharField(max_length=20)
    question = models.TextField()
    options = models.JSONField(null=True, blank=True)
    answer = models.CharField(max_length=255)
    explanation = models.TextField(null=True, blank=True)
    source_post = models.ForeignKey(Post, on_delete=models.DO_NOTHING, null=True, blank=True)
    source_title = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'quizzes'

    def __str__(self):
        return self.question[:50]


class QuizAttempt(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.DO_NOTHING)
    quiz = models.ForeignKey(Quiz, on_delete=models.DO_NOTHING)
    user_answer = models.CharField(max_length=255)
    is_correct = models.BooleanField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'quiz_attempts'
